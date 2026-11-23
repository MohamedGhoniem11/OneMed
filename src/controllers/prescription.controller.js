import * as ocr from "../services/ocr.service.js";
import * as parser from "../services/prescription.parser.js";
import * as service from "../services/prescription.service.js";
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
    res.status(201).json(await service.create(req.user.uid, req.body));
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
    if (req.user.role !== "admin" && prescription.doctorId !== req.user.uid) {
      throw httpError(403, "Forbidden");
    }
    res.json(prescription);
  } catch (err) {
    next(err);
  }
}
