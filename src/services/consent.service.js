import { getStore } from "../store/index.js";
import { httpError } from "../utils/http-error.js";

/**
 * Consent service (R23, R28).
 *
 * A grant is a record with a scope list and a grantee (doctor or institution).
 * Reads and record access are consent-gated by `consent.service.js` helpers.
 * Revocation is explicit and audited.
 */

const CONSENTS = "consents";

function normalizeScope(scope) {
  const unique = [...new Set(scope)];
  return unique;
}

export function keyFor(consent) {
  return `${consent.granteeType}:${consent.granteeId}:${[...consent.scope].sort().join("+")}`;
}

function isActive(consent, now = new Date()) {
  if (consent.status !== "active") return false;
  if (consent.expiresAt) {
    const expiry = new Date(consent.expiresAt);
    if (expiry <= now) return false;
  }
  return true;
}

export async function grant(patientId, data) {
  const now = new Date();
  const scope = normalizeScope(data.scope);
  const consent = await getStore().add(CONSENTS, {
    patientId,
    granteeType: data.granteeType,
    granteeId: data.granteeId,
    scope,
    purpose: data.purpose ?? "",
    status: "active",
    grantedAt: now,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    revokedAt: null,
    createdAt: now,
    updatedAt: now,
  });
  return consent;
}

export async function getById(consentId) {
  return getStore().get(CONSENTS, consentId);
}

export async function revoke(consentId, reason = "") {
  const consent = await getStore().get(CONSENTS, consentId);
  if (!consent) throw httpError(404, "Consent not found");
  if (consent.status === "revoked") return consent;
  const now = new Date();
  return getStore().update(CONSENTS, consentId, {
    status: "revoked",
    revokedAt: now,
    revokedReason: reason,
    updatedAt: now,
  });
}

export async function listForPatient(patientId, { status } = {}) {
  const where = [{ field: "patientId", op: "==", value: patientId }];
  if (status) where.push({ field: "status", op: "==", value: status });
  const { items } = await getStore().query(CONSENTS, {
    where,
    orderBy: [{ field: "createdAt", direction: "desc" }],
    limit: 200,
  });
  return items;
}

export async function hasActiveConsent(patientId, granteeType, granteeId, scope, now = new Date()) {
  const { items } = await getStore().query(CONSENTS, {
    where: [
      { field: "patientId", op: "==", value: patientId },
      { field: "granteeType", op: "==", value: granteeType },
      { field: "granteeId", op: "==", value: granteeId },
      { field: "status", op: "==", value: "active" },
    ],
    limit: 100,
  });
  return items.some((consent) => consent.scope.includes(scope) && isActive(consent, now));
}

export async function findActiveForGrantee(granteeType, granteeId, now = new Date()) {
  const { items } = await getStore().query(CONSENTS, {
    where: [
      { field: "granteeType", op: "==", value: granteeType },
      { field: "granteeId", op: "==", value: granteeId },
      { field: "status", op: "==", value: "active" },
    ],
    limit: 500,
  });
  return items.filter((consent) => isActive(consent, now));
}

/** One query for all patients this requester may read, instead of one query
 * per candidate patient. `null` means unrestricted (admin). */
export async function allowedPatientsFor(req, scope = "records", now = new Date()) {
  const role = req?.user?.role;
  if (role === "admin") return null;
  let granteeType;
  let granteeId;
  if (role === "doctor") {
    granteeType = "doctor"; granteeId = req.user.uid;
  } else if (role === "lab_staff" || role === "hospital_admin") {
    granteeType = "institution"; granteeId = req.affiliation?.institutionId;
  }
  if (!granteeType || !granteeId) return new Set();
  const grants = await findActiveForGrantee(granteeType, granteeId, now);
  return new Set(grants.filter((c) => c.scope.includes(scope)).map((c) => c.patientId));
}

export function isSelfOrAdminUser(req, patientId) {
  return req?.user?.uid === patientId || req?.user?.role === "admin";
}

export const consentInternals = { CONSENTS, isActive };