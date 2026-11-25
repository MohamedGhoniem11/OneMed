import { getStore } from "../store/index.js";
import { httpError } from "../utils/http-error.js";
import { auditRequest } from "../services/audit.service.js";
import { hasActiveConsent } from "../services/consent.service.js";
import { createEmergency, createNfc, findNfcForPatient, resolveNfc } from "../services/token.service.js";

const send = (fn, status = 200) => async (req, res, next) => {
  try { res.status(status).json(await fn(req)); } catch (error) { next(error); }
};

export const issue = send(async (req) => {
  const patientId = req.body?.patientId;
  if (!patientId) throw httpError(400, "patientId is required");
  const allowed = patientId === req.user.uid || req.user.role === "admin"
    || (req.user.role === "doctor" && await hasActiveConsent(patientId, "doctor", req.user.uid, "records"));
  if (!allowed) throw httpError(403, "Not allowed to issue a token for this patient");
  const patient = await getStore().get("patients", patientId);
  if (!patient) throw httpError(404, "Patient not found");
  const result = await createNfc({ patientId, nfcUid: req.body.nfcUid, issuedBy: req.user.uid });
  await auditRequest(req, {
    action: "nfc_issued",
    resourceType: "nfc",
    resourceId: result.record.id,
    patientId,
    metadata: { nfcUid: result.record.nfcUid || null },
  });
  // The raw token is returned exactly once; the database keeps only its hash.
  return { token: result.token, url: result.url, nfcUid: result.record.nfcUid, createdAt: result.record.createdAt };
}, 201);

export const resolve = send(async (req) => {
  const result = await resolveNfc(req.params.token);
  await auditRequest(req, {
    action: "nfc_scanned",
    resourceType: "nfc",
    resourceId: result.record.id,
    patientId: result.patientId,
    actorId: null,
    actorRole: "public",
  });
  // The emergency URL uses a separate, privacy-filtered capability token.
  // Issuing it here makes the NFC "Emergency Info" button work without
  // exposing the patient ID or full record in the public URL.
  const emergency = await createEmergency({ patientId: result.patientId, issuedBy: null, stable: true });
  return {
    patientId: result.patientId,
    valid: true,
    emergencyToken: emergency.token,
    emergencyUrl: emergency.url,
  };
});

export const mine = send(async (req) => {
  const record = await findNfcForPatient(req.user.uid);
  if (!record) return { issued: false };
  return {
    issued: true,
    nfcUid: record.nfcUid,
    scanCount: record.scanCount || 0,
    lastScanAt: record.lastScanAt,
    createdAt: record.createdAt,
    revoked: Boolean(record.revokedAt),
  };
});
