import { getStore } from "../store/index.js";
import { validate } from "../utils/schema.js";
import { consentGrantSchema } from "../schemas/consent.schema.js";
import { httpError } from "../utils/http-error.js";
import { auditRequest } from "../services/audit.service.js";
import { grant } from "../services/consent.service.js";
import { acceptConnection, createConnection, resolveConnection } from "../services/token.service.js";

const send = (fn, status = 200) => async (req, res, next) => {
  try { res.status(status).json(await fn(req)); } catch (error) { next(error); }
};

export const createQr = send(async (req) => {
  const data = validate(consentGrantSchema, {
    granteeType: "doctor",
    granteeId: req.user.uid,
    scope: req.body.scope,
    purpose: req.body.purpose,
  });
  const patient = await getStore().get("patients", req.body.patientId);
  if (!patient) throw httpError(404, "Patient not found");
  const user = await getStore().get("users", req.user.uid);
  const result = await createConnection({
    patientId: patient.id,
    doctorId: req.user.uid,
    doctorName: user?.name || req.user.email,
    scope: data.scope,
    purpose: data.purpose,
  });
  await auditRequest(req, {
    action: "connection_qr_created",
    resourceType: "connection",
    resourceId: result.record.id,
    patientId: patient.id,
    metadata: { scope: data.scope, expiresAt: result.expiresAt },
  });
  return { token: result.token, url: result.url, expiresAt: result.expiresAt, scope: data.scope };
}, 201);

/** Public: a scanned QR reveals the requesting clinician, never clinical data. */
export const resolve = send(async (req) => {
  const { payload, record } = await resolveConnection(req.params.token);
  return {
    valid: true,
    doctorName: payload.doctorName,
    scope: payload.scope,
    purpose: payload.purpose,
    expiresAt: new Date(payload.exp * 1000),
    accepted: Boolean(record.acceptedAt),
    requiresPatientLogin: true,
  };
});

export const accept = send(async (req) => {
  const connection = await acceptConnection(req.params.token, { patientId: req.user.uid });
  const consent = await grant(req.user.uid, {
    granteeType: "doctor",
    granteeId: connection.doctorId,
    scope: connection.scope,
    purpose: connection.purpose || "QR connection",
    expiresAt: connection.expiresAt.toISOString(),
  });
  await auditRequest(req, {
    action: "consent_granted",
    resourceType: "consent",
    resourceId: consent.id,
    patientId: req.user.uid,
    purpose: connection.purpose,
    metadata: { source: "connection_qr", doctorId: connection.doctorId },
  });
  return { consent, doctorName: connection.doctorName, scope: connection.scope, expiresAt: connection.expiresAt };
}, 201);
