import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { getJwtSecret } from "../auth/jwt-secret.js";
import { getStore } from "../store/index.js";
import { httpError } from "../utils/http-error.js";

/**
 * Signed, short-lived capability tokens for QR consent connections and NFC
 * patient identification (R24/R34/R35). Raw tokens are returned once and never
 * stored; only SHA-256 hashes and revocation metadata live in the database.
 */
const CONNECTIONS = "connectionTokens";
const NFC_TOKENS = "nfcTokens";
const EMERGENCY = "emergencyQr";
const FULFILLMENT = "fulfillmentLinks";
const hash = (token) => crypto.createHash("sha256").update(token).digest("hex");
// Domain separation from the login access-token key, without a second secret.
const key = (domain) => crypto.createHmac("sha256", getJwtSecret()).update(domain).digest();

function sign({ domain, audience, subject, payload, expiresIn, jti = crypto.randomUUID() }) {
  const options = {
    algorithm: "HS256",
    subject,
    issuer: env.authJwtIssuer,
    audience,
    jwtid: jti,
  };
  if (expiresIn !== undefined) options.expiresIn = expiresIn;
  return jwt.sign(payload, key(domain), options);
}

function verify(token, { domain, audience }) {
  try {
    return jwt.verify(token, key(domain), {
      algorithms: ["HS256"],
      issuer: env.authJwtIssuer,
      audience,
    });
  } catch {
    throw httpError(400, "Invalid or expired token");
  }
}

function activeRecord(record, now = new Date()) {
  if (!record) throw httpError(404, "Token not found");
  if (record.revokedAt) throw httpError(403, "Token has been revoked");
  if (record.expiresAt && new Date(record.expiresAt) <= now) throw httpError(400, "Token has expired");
  return record;
}

export async function createConnection({ patientId, doctorId, doctorName, scope, purpose, ttlSeconds = env.connectionTtlSeconds }) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
  const jti = crypto.randomUUID();
  const token = sign({
    domain: "onemed-connection",
    audience: "onemed-connect",
    subject: patientId,
    expiresIn: ttlSeconds,
    jti,
    payload: { typ: "connection", patientId, doctorId, doctorName: doctorName || null, scope, purpose: purpose || "" },
  });
  const record = await getStore().set(CONNECTIONS, jti, {
    tokenHash: hash(token),
    patientId,
    doctorId,
    scope,
    purpose: purpose || "",
    createdAt: now,
    expiresAt,
    acceptedAt: null,
    revokedAt: null,
  });
  return { token, record, url: `${env.publicBaseUrl}/qr/${token}`, expiresAt };
}

export async function resolveConnection(token) {
  const payload = verify(token, { domain: "onemed-connection", audience: "onemed-connect" });
  if (payload.typ !== "connection") throw httpError(400, "Invalid token type");
  const record = activeRecord(await getStore().get(CONNECTIONS, payload.jti));
  if (record.tokenHash !== hash(token)) throw httpError(400, "Token mismatch");
  return { payload, record };
}

export async function acceptConnection(token, { patientId }) {
  const { payload, record } = await resolveConnection(token);
  if (payload.patientId !== patientId) throw httpError(403, "This connection belongs to another patient");
  if (record.acceptedAt) throw httpError(409, "Connection already accepted");
  await getStore().update(CONNECTIONS, record.id, { acceptedAt: new Date() });
  return { doctorId: payload.doctorId, doctorName: payload.doctorName, scope: payload.scope, purpose: payload.purpose, expiresAt: new Date(payload.exp * 1000) };
}

export async function createNfc({ patientId, nfcUid, issuedBy, ttlSeconds = env.nfcTtlSeconds }) {
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  const token = sign({
    domain: "onemed-nfc",
    audience: "onemed-nfc",
    subject: patientId,
    jti,
    expiresIn: ttlSeconds,
    payload: { typ: "nfc", patientId, nfcUid: nfcUid || null },
  });
  const record = await getStore().set(NFC_TOKENS, jti, {
    tokenHash: hash(token),
    patientId,
    nfcUid: nfcUid || null,
    issuedBy: issuedBy || null,
    createdAt: new Date(),
    expiresAt,
    scanCount: 0,
    lastScanAt: null,
    revokedAt: null,
  });
  return { token, record, url: `${env.publicBaseUrl}/nfc/${token}`, jti };
}

export async function resolveNfc(token) {
  const payload = verify(token, { domain: "onemed-nfc", audience: "onemed-nfc" });
  if (payload.typ !== "nfc") throw httpError(400, "Invalid token type");
  const record = activeRecord(await getStore().get(NFC_TOKENS, payload.jti));
  if (record.tokenHash !== hash(token)) throw httpError(400, "Token mismatch");
  const updated = await getStore().update(NFC_TOKENS, record.id, {
    scanCount: (record.scanCount || 0) + 1,
    lastScanAt: new Date(),
  });
  return { patientId: payload.patientId, nfcUid: payload.nfcUid, record: updated };
}

export async function findNfcForPatient(patientId) {
  const { items } = await getStore().query(NFC_TOKENS, {
    where: [{ field: "patientId", op: "==", value: patientId }],
    orderBy: [{ field: "createdAt", direction: "desc" }],
    limit: 1,
  });
  return items[0] || null;
}

export async function createEmergency({ patientId, issuedBy, ttlSeconds = env.emergencyTtlSeconds, stable = false }) {
  // A wearable must resolve to the same emergency URL on every tap. A stable
  // jti avoids minting an unbounded number of long-lived bearer tokens on each
  // anonymous NFC scan; the token is still domain-separated and revocable.
  const jti = stable
    ? crypto.createHmac("sha256", getJwtSecret()).update(`emergency:${patientId}`).digest("hex").slice(0, 36)
    : crypto.randomUUID();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  const token = sign({
    domain: "onemed-emergency",
    audience: "onemed-emergency",
    subject: patientId,
    jti,
    expiresIn: ttlSeconds,
    payload: { typ: "emergency", patientId },
  });
  const record = await getStore().set(EMERGENCY, jti, {
    tokenHash: hash(token),
    patientId,
    issuedBy: issuedBy || null,
    createdAt: new Date(),
    expiresAt,
    scanCount: 0,
    lastScanAt: null,
    revokedAt: null,
  });
  return { token, record, url: `${env.publicBaseUrl}/emergency/${token}` };
}

export async function resolveEmergency(token) {
  const payload = verify(token, { domain: "onemed-emergency", audience: "onemed-emergency" });
  if (payload.typ !== "emergency") throw httpError(400, "Invalid token type");
  const record = activeRecord(await getStore().get(EMERGENCY, payload.jti));
  if (record.tokenHash !== hash(token)) throw httpError(400, "Token mismatch");
  const updated = await getStore().update(EMERGENCY, record.id, {
    scanCount: (record.scanCount || 0) + 1,
    lastScanAt: new Date(),
  });
  return { patientId: payload.patientId, record: updated };
}

export async function createFulfillment({ prescriptionId, patientId, ttlSeconds = env.fulfillmentTtlSeconds }) {
  const jti = crypto.randomUUID();
  const token = sign({
    domain: "onemed-fulfillment",
    audience: "onemed-fulfillment",
    subject: patientId,
    expiresIn: ttlSeconds,
    jti,
    payload: { typ: "fulfillment", prescriptionId, patientId },
  });
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  const record = await getStore().set(FULFILLMENT, jti, {
    tokenHash: hash(token),
    prescriptionId,
    patientId,
    createdAt: new Date(),
    expiresAt,
    usedAt: null,
    revokedAt: null,
  });
  return { token, record, expiresAt, url: `${env.publicBaseUrl}/f/${token}` };
}

export async function resolveFulfillment(token) {
  const payload = verify(token, { domain: "onemed-fulfillment", audience: "onemed-fulfillment" });
  if (payload.typ !== "fulfillment") throw httpError(400, "Invalid token type");
  const record = activeRecord(await getStore().get(FULFILLMENT, payload.jti));
  if (record.tokenHash !== hash(token)) throw httpError(400, "Token mismatch");
  return { prescriptionId: payload.prescriptionId, patientId: payload.patientId, record };
}

export async function revokeNfc(id) {
  const record = await getStore().get(NFC_TOKENS, id);
  if (!record) throw httpError(404, "NFC token not found");
  if (record.revokedAt) return record;
  return getStore().update(NFC_TOKENS, id, { revokedAt: new Date() });
}
