import * as ocr from "../services/ocr.service.js";
import * as parser from "../services/prescription.parser.js";
import * as service from "../services/prescription.service.js";
import { hasActiveConsent } from "../services/consent.service.js";
import { auditRequest } from "../services/audit.service.js";
import { httpError } from "../utils/http-error.js";
import { parseLimit } from "../utils/query.js";

export async function extract(req, res, next) {
  try {
    if (!req.file) throw httpError(400, "image file is required (multipart field name: image)");
    const { text, confidence, lang } = await ocr.extractText(req.file.buffer, {
      lang: req.body?.lang || undefined,
    });
    const { items, warnings } = parser.parse(text, { confidence });
    res.json({ rawText: text, ocrConfidence: confidence, lang, items, warnings });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const prescription = await service.create(req.user.uid, req.body);
    await auditRequest(req, {
      action: "prescription_created",
      resourceType: "prescription",
      resourceId: prescription.id,
      patientId: prescription.patientId,
    });
    res.status(201).json(prescription);
  } catch (err) {
    next(err);
  }
}

export async function listForPatient(req, res, next) {
  try {
    const patientId = req.params.patientId;
    const isSelf = req.user.role === "patient" && req.user.uid === patientId;
    const isDoctor = req.user.role === "doctor";
    if (!isSelf && !isDoctor && req.user.role !== "admin") throw httpError(403, "Forbidden");
    if (isDoctor && !isSelf) {
      const consented = await hasActiveConsent(patientId, "doctor", req.user.uid, "prescriptions");
      if (!consented && req.user.role !== "admin") throw httpError(403, "No consent to read this patient's prescriptions");
    }
    const page = await service.list({
      patientId,
      limit: parseLimit(req.query.limit),
      startAfter: req.query.startAfter,
    });
    res.json(page);
  } catch (err) {
    next(err);
  }
}

export async function list(req, res, next) {
  try {
    const limit = parseLimit(req.query.limit);
    const doctorId = req.user.role === "admin" ? req.query.doctorId : req.user.uid;
    res.json(
      await service.list({
        doctorId,
        patientId: req.query.patientId,
        limit,
        startAfter: req.query.startAfter,
      }),
    );
  } catch (err) {
    next(err);
  }
}

export async function getOne(req, res, next) {
  try {
    const prescription = await service.getById(req.params.id);
    if (!prescription) throw httpError(404, "Prescription not found");

    const isOwnerDoctor = prescription.doctorId === req.user.uid;
    const isAdmin = req.user.role === "admin";
    const isPatientOwner = req.user.role === "patient" && prescription.patientId === req.user.uid;

    if (isOwnerDoctor || isAdmin || isPatientOwner) {
      res.json(prescription);
      return;
    }

    if (req.user.role === "doctor") {
      const consented = await hasActiveConsent(prescription.patientId, "doctor", req.user.uid, "prescriptions");
      if (consented) {
        res.json(prescription);
        return;
      }
    }

    throw httpError(403, "Forbidden");
  } catch (err) {
    next(err);
  }
}
