import * as service from "../services/patient.service.js";
import { updateMe } from "../controllers/user.controller.js";
import { validate } from "../utils/schema.js";
import { emergencyOverrideSchema, patientUpdateSchema } from "../schemas/patient.schema.js";
import { canReadPatient } from "../middleware/consent.js";
import { httpError } from "../utils/http-error.js";
import { auditRequest } from "../services/audit.service.js";

export const me = updateMe;
export const updateMePatch = updateMe;

export async function updatePatientMe(req, res, next) {
  try {
    const data = validate(patientUpdateSchema, req.body, { partial: true });
    if (Object.keys(data).length === 0) {
      res.status(400).json({ message: "nothing to update", requestId: req.id });
      return;
    }
    const patient = await service.updatePatientProfile(req.user.uid, data);
    res.json(patient);
  } catch (err) {
    next(err);
  }
}

export async function search(req, res, next) {
  try {
    const patients = await service.searchPatients(req, req.query.q, req.query.limit);
    res.json({ patients });
  } catch (err) { next(err); }
}

export async function override(req, res, next) {
  try {
    const data = validate(emergencyOverrideSchema, req.body);
    res.json(await service.emergencyOverride(req, req.params.id, data));
  } catch (err) { next(err); }
}

export async function getById(req, res, next) {
  try {
    await canReadPatient(req, req.params.id, { scope: "demographics" });
    const patient = await service.getPatient(req.params.id);
    if (!patient) throw httpError(404, "Patient not found");
    res.json(patient);
  } catch (err) {
    next(err);
  }
}

export async function requestDeletion(req, res, next) {
  try {
    const patientId = req.params.id;
    if (patientId !== req.user.uid && req.user.role !== "admin") throw httpError(403, "Forbidden");
    const request = await service.requestDeletion(patientId, req.body?.reason || "");
    await auditRequest(req, { action: "deletion_requested", resourceType: "patient", resourceId: patientId, patientId });
    res.status(201).json(request);
  } catch (err) { next(err); }
}

export async function records(req, res, next) {
  try {
    const page = await service.listPatientRecords(req.params.id, {
      type: req.query.type,
      limit: req.query.limit,
      startAfter: req.query.startAfter,
    });
    res.json({ records: page.items, nextCursor: page.nextCursor });
  } catch (err) {
    next(err);
  }
}

export async function prescriptions(req, res, next) {
  try {
    const page = await service.listPatientPrescriptions(req.params.id, {
      limit: req.query.limit,
      startAfter: req.query.startAfter,
    });
    res.json({ prescriptions: page.items, nextCursor: page.nextCursor });
  } catch (err) {
    next(err);
  }
}