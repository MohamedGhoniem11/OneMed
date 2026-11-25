import * as ocr from "../services/ocr.service.js";
import * as parser from "../services/prescription.parser.js";
import * as service from "../services/prescription.service.js";
import { hasActiveConsent } from "../services/consent.service.js";
import { canReadPatient } from "../middleware/consent.js";
import { auditRequest } from "../services/audit.service.js";
import { generate, llmMode } from "../services/llm.service.js";
import { httpError } from "../utils/http-error.js";
import { parseLimit } from "../utils/query.js";

const EXTRACT_SYSTEM = "You are a medical prescription data extractor. Extract all medicines from the provided prescription text. For each medicine return name, dosage, frequency, duration, instructions. Use null for missing fields. Return ONLY a valid JSON array. Do not diagnose or recommend medication.";

function fallbackItems(text, confidence) {
  return parser.parse(text, { confidence }).items.map((item) => ({
    name: item.name,
    dosage: item.dose || null,
    frequency: item.frequency || null,
    duration: item.duration || null,
    instructions: item.notes || null,
    confidence: null,
  }));
}

async function extractWithLlm(text, confidence) {
  const heuristic = fallbackItems(text, confidence);
  if (llmMode() !== "gemini") return { items: heuristic, mode: "offline", warnings: [] };
  try {
    const result = await generate({
      system: EXTRACT_SYSTEM,
      prompt: `Prescription OCR text:\n${text}\n\nReturn JSON array only.`,
      maxOutputTokens: 800,
    });
    const match = result.text.match(/\[[\s\S]*\]/);
    if (!match) return { items: heuristic, mode: "gemini-fallback", warnings: ["LLM did not return JSON; used local parser"] };
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed) || !parsed.length) return { items: heuristic, mode: "gemini-fallback", warnings: ["LLM returned no medicines; used local parser"] };
    const items = parsed.map((m) => ({
      name: String(m.name || "").slice(0, 120),
      dosage: m.dosage ? String(m.dosage).slice(0, 80) : null,
      frequency: m.frequency ? String(m.frequency).slice(0, 80) : null,
      duration: m.duration ? String(m.duration).slice(0, 80) : null,
      instructions: m.instructions ? String(m.instructions).slice(0, 300) : null,
      confidence: typeof m.confidence === "number" ? m.confidence : null,
    })).filter((m) => m.name);
    return { items, mode: "gemini", warnings: [] };
  } catch {
    return { items: heuristic, mode: "gemini-fallback", warnings: ["LLM unavailable; used local parser"] };
  }
}

export async function extract(req, res, next) {
  try {
    if (!req.file) throw httpError(400, "image file is required (multipart field name: image)");
    const { text, confidence, lang } = await ocr.extractText(req.file.buffer, {
      lang: req.body?.lang || undefined,
    });
    const result = await extractWithLlm(text, confidence);
    await auditRequest(req, {
      action: "prescription_extracted",
      resourceType: "prescription",
      metadata: { confidence, mode: result.mode, items: result.items.length },
    });
    res.json({ rawText: text, ocrConfidence: confidence, lang, items: result.items, warnings: result.warnings, mode: result.mode });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    if (!req.body?.patientId) throw httpError(400, "patientId is required");
    await canReadPatient(req, req.body.patientId, { scope: "prescriptions" });
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

export async function confirm(req, res, next) {
  try {
    const prescription = await service.confirm(req.params.id, req.user.uid, req.body, { actorName: req.user.email });
    await auditRequest(req, {
      action: "prescription_confirmed",
      resourceType: "prescription",
      resourceId: prescription.id,
      patientId: prescription.patientId,
    });
    res.json(prescription);
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
    const isPatient = req.user.role === "patient";
    const doctorId = req.user.role === "admin" ? req.query.doctorId : (isPatient ? undefined : req.user.uid);
    const patientId = isPatient ? req.user.uid : req.query.patientId;
    res.json(
      await service.list({
        doctorId,
        patientId,
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
