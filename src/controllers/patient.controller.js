import * as service from "../services/patient.service.js";
import { updateMe } from "../controllers/user.controller.js";
import { validate } from "../utils/schema.js";
import { patientUpdateSchema } from "../schemas/patient.schema.js";

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

export async function getById(req, res, next) {
  try {
    const patient = await service.getPatient(req.params.id);
    res.json(patient ?? { message: "Patient not found", requestId: req.id });
  } catch (err) {
    next(err);
  }
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