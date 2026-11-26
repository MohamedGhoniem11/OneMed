import crypto from "node:crypto";
import { env } from "../config/env.js";
import { getJwtSecret } from "../auth/jwt-secret.js";
import { getStore } from "../store/index.js";
import { httpError } from "../utils/http-error.js";

/**
 * Opaque, domain-separated capability tokens (R24/R29/R34/R35/R37).
 *
 * Tokens contain NO patient identifier: they are random strings with a domain
 * prefix, and only their SHA-256 hashes plus the patient/reference metadata are
 * stored server-side. This satisfies the document's "no direct patient ID in
 * the URL" rule and keeps raw tokens out of the database and logs.
 */
const CONNECTIONS = "connectionTokens";
const NFC_TOKENS = "nfcTokens";
const EMERGENCY = "emergencyQr";
const FULFILLMENT = "fulfillmentLinks";
const hash = (token) => crypto.createHash("sha256").update(token).digest("hex");
const hmac = (value) => crypto.createHmac("sha256", getJwtSecret()).update(value).digest();

const PREFIX = {
  connection: "om_conn",
  nfc: "om_nfc",
  emergency: "om_em",
  fulfillment: "om_rx",
};

function issueToken(kind, { ttlSeconds, stableKey }) {
  const jti = stableKey
    ? hmac(`jti:${kind}:${stableKey}`).toString("hex").slice(0, 36)
    : crypto.randomUUID();
  const secret = stableKey ? hmac(`token:${kind}:${stableKey}`) : crypto.randomBytes(32);
  return {
    jti,
    token: `${PREFIX[kind]}_${secret.toString("base64url")}`,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000),
  };
}

async function resolveToken(kind, collection, token) {
  const prefix = `${PREFIX[kind]}_`;
  if (typeof token !== "string" || !token.startsWith(prefix)) throw httpError(400, "Invalid token type");
  const { items } = await getStore().query(collection, {
    where: [{ field: "tokenHash", op: "==", value: hash(token) }], limit: 1,
  });
  const record = items[0];
  if (!record) throw httpError(404, "Token not found");
  if (record.revokedAt) throw httpError(403, "Token has been revoked");
  if (record.expiresAt && new Date(record.expiresAt) <= new Date()) throw httpError(400, "Token has expired");
  return record;
}

export async function createConnection({ patientId, doctorId, doctorName, scope, purpose, ttlSeconds = env.connectionTtlSeconds }) {
  const { jti, token, expiresAt } = issueToken("connection", { ttlSeconds });
  const now = new Date();
  const record = await getStore().set(CONNECTIONS, jti, {
    tokenHash: hash(token),
    patientId, doctorId, doctorName: doctorName || null, scope, purpose: purpose || "",
    createdAt: now, expiresAt, acceptedAt: null, revokedAt: null,
  });
  return { token, record, url: `${env.publicBaseUrl}/qr/${token}`, expiresAt };
}

export async function resolveConnection(token) {
  const record = await resolveToken("connection", CONNECTIONS, token);
  return { payload: {
    typ: "connection", patientId: record.patientId, doctorId: record.doctorId,
    doctorName: record.doctorName, scope: record.scope, purpose: record.purpose,
    exp: new Date(record.expiresAt).getTime() / 1000,
  }, record };
}

export async function acceptConnection(token, { patientId }) {
  const { payload, record } = await resolveConnection(token);
  if (payload.patientId !== patientId) throw httpError(403, "This connection belongs to another patient");
  if (record.acceptedAt) throw httpError(409, "Connection already accepted");
  await getStore().update(CONNECTIONS, record.id, { acceptedAt: new Date() });
  return { doctorId: payload.doctorId, doctorName: payload.doctorName, scope: payload.scope, purpose: payload.purpose, expiresAt: new Date(payload.exp * 1000) };
}

export async function createNfc({ patientId, nfcUid, issuedBy, ttlSeconds = env.nfcTtlSeconds }) {
  const { jti, token, expiresAt } = issueToken("nfc", { ttlSeconds });
  const record = await getStore().set(NFC_TOKENS, jti, {
    tokenHash: hash(token), patientId, nfcUid: nfcUid || null, issuedBy: issuedBy || null,
    createdAt: new Date(), expiresAt, scanCount: 0, lastScanAt: null, revokedAt: null,
  });
  return { token, record, url: `${env.publicBaseUrl}/nfc/${token}`, jti };
}

export async function resolveNfc(token) {
  const record = await resolveToken("nfc", NFC_TOKENS, token);
  const updated = await getStore().update(NFC_TOKENS, record.id, {
    scanCount: (record.scanCount || 0) + 1, lastScanAt: new Date(),
  });
  return { patientId: record.patientId, nfcUid: record.nfcUid, record: updated };
}

export async function findNfcForPatient(patientId) {
  const { items } = await getStore().query(NFC_TOKENS, {
    where: [{ field: "patientId", op: "==", value: patientId }],
    orderBy: [{ field: "createdAt", direction: "desc" }], limit: 1,
  });
  return items[0] || null;
}

export async function createEmergency({ patientId, issuedBy, ttlSeconds = env.emergencyTtlSeconds, stable = false }) {
  // A wearable resolves to the same opaque URL on every tap; the token itself
  // is an HMAC-derived random string and reveals nothing about the patient.
  const { jti, token, expiresAt } = issueToken("emergency", { ttlSeconds, stableKey: stable ? patientId : null });
  const record = await getStore().set(EMERGENCY, jti, {
    tokenHash: hash(token), patientId, issuedBy: issuedBy || null,
    createdAt: new Date(), expiresAt, scanCount: 0, lastScanAt: null, revokedAt: null,
  });
  return { token, record, url: `${env.publicBaseUrl}/emergency/${token}` };
}

export async function resolveEmergency(token) {
  const record = await resolveToken("emergency", EMERGENCY, token);
  const updated = await getStore().update(EMERGENCY, record.id, {
    scanCount: (record.scanCount || 0) + 1, lastScanAt: new Date(),
  });
  return { patientId: record.patientId, record: updated };
}

export async function createFulfillment({ prescriptionId, patientId, ttlSeconds = env.fulfillmentTtlSeconds }) {
  const { jti, token, expiresAt } = issueToken("fulfillment", { ttlSeconds });
  const record = await getStore().set(FULFILLMENT, jti, {
    tokenHash: hash(token), prescriptionId, patientId, createdAt: new Date(),
    expiresAt, usedAt: null, revokedAt: null,
  });
  return { token, record, expiresAt, url: `${env.publicBaseUrl}/f/${token}` };
}

export async function resolveFulfillment(token) {
  const record = await resolveToken("fulfillment", FULFILLMENT, token);
  return { prescriptionId: record.prescriptionId, patientId: record.patientId, record };
}

export async function revokeNfc(id) {
  const record = await getStore().get(NFC_TOKENS, id);
  if (!record) throw httpError(404, "NFC token not found");
  if (record.revokedAt) return record;
  return getStore().update(NFC_TOKENS, id, { revokedAt: new Date() });
}

export async function revokeEmergency(id) {
  const record = await getStore().get(EMERGENCY, id);
  if (!record) throw httpError(404, "Emergency token not found");
  return getStore().update(EMERGENCY, id, { revokedAt: new Date() });
}
