import * as service from "../services/emergency.service.js";
import { createEmergency } from "../services/token.service.js";
import { validate } from "../utils/schema.js";
import { emergencyChatSchema, privacyUpdateSchema } from "../schemas/emergency.schema.js";
import { auditRequest } from "../services/audit.service.js";

const send = (fn) => async (req, res, next) => {
  try { res.json(await fn(req)); } catch (error) { next(error); }
};

export const createQr = send(async (req) => {
  const result = await createEmergency({ patientId: req.user.uid, issuedBy: req.user.uid });
  await auditRequest(req, {
    action: "emergency_qr_created",
    resourceType: "emergency",
    resourceId: result.record.id,
    patientId: req.user.uid,
  });
  return { token: result.token, url: result.url, createdAt: result.record.createdAt };
});

export const profile = send((req) => service.publicProfile(req.params.token, req));

/** Returns a fresh emergency link for the signed-in patient's own wearable. */
export const mine = send(async (req) => {
  if (req.user?.role !== "patient") return { token: null };
  const result = await createEmergency({ patientId: req.user.uid, issuedBy: req.user.uid });
  return { token: result.token, url: result.url, expiresAt: result.record.expiresAt };
});

export const chat = send(async (req) => {
  const body = validate(emergencyChatSchema, req.body);
  return service.chat(req.params.token, body.message, { req, language: body.language || "en" });
});

export const privacy = send(async (req) => {
  const settings = validate(privacyUpdateSchema, req.body);
  const patient = await service.updatePrivacy(req.user.uid, settings);
  await auditRequest(req, {
    action: "emergency_privacy_updated",
    resourceType: "patient",
    resourceId: patient.id,
    patientId: patient.id,
    metadata: settings,
  });
  return { settings: patient.privacy };
});
