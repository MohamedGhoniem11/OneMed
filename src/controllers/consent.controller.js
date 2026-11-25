import * as service from "../services/consent.service.js";
import { auditRequest } from "../services/audit.service.js";
import { getStore } from "../store/index.js";
import { validate } from "../utils/schema.js";
import { consentGrantSchema } from "../schemas/consent.schema.js";
import { httpError } from "../utils/http-error.js";

async function ownedByPatient(req, patientId) {
  const patient = await getStore().get("patients", patientId);
  if (!patient) throw httpError(404, "Patient not found");
  return patient;
}

export async function listMine(req, res, next) {
  try {
    const patientId = req.params.id || req.user.uid;
    if (req.params.id && req.user.role !== "admin" && req.user.uid !== req.params.id) {
      throw httpError(403, "Forbidden");
    }
    const consents = await service.listForPatient(patientId);
    res.json({ consents });
  } catch (err) {
    next(err);
  }
}

export async function grant(req, res, next) {
  try {
    const data = validate(consentGrantSchema, req.body);
    const patientId = req.user.uid;
    await ownedByPatient(req, patientId);
    const consent = await service.grant(patientId, data);
    await auditRequest(req, {
      action: "consent_granted",
      resourceType: "consent",
      resourceId: consent.id,
      patientId,
      purpose: data.purpose ?? "",
    });
    res.status(201).json({ consent });
  } catch (err) {
    next(err);
  }
}

export async function revoke(req, res, next) {
  try {
    const existing = await service.getById(req.params.id);
    if (!existing) throw httpError(404, "Consent not found");
    if (existing.patientId !== req.user.uid && req.user.role !== "admin") {
      throw httpError(403, "Only the patient or an administrator may revoke this consent");
    }
    const consent = await service.revoke(req.params.id, req.body?.reason ?? "");
    await auditRequest(req, {
      action: "consent_revoked",
      resourceType: "consent",
      resourceId: consent.id,
      patientId: consent.patientId,
    });
    res.json({ consent });
  } catch (err) {
    next(err);
  }
}

export async function listForGrantee(req, res, next) {
  try {
    const granteeType = req.user.role === "doctor" ? "doctor" : "institution";
    const granteeId = granteeType === "doctor" ? req.user.uid : req.affiliation?.institutionId;
    if (!granteeId) throw httpError(400, "No institution affiliation is configured for this account");
    const consents = await service.findActiveForGrantee(granteeType, granteeId);
    res.json({
      consents: consents.map((consent) => ({
        id: consent.id,
        patientId: consent.patientId,
        scope: consent.scope,
        purpose: consent.purpose,
        grantedAt: consent.grantedAt,
        expiresAt: consent.expiresAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}