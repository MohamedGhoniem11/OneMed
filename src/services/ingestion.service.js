import { getStore } from "../store/index.js";
import { httpError } from "../utils/http-error.js";
import { validate } from "../utils/schema.js";
import { env } from "../config/env.js";
import { manualRecordSchema, recordSchema, reviewSchema } from "../schemas/record.schema.js";
import { auditRequest } from "./audit.service.js";
import { extractText as ocrText } from "./ocr.service.js";
import { extractPdfText, rasterizePdf } from "./pdf.service.js";
import { normalizeCsv, normalizeDicom, normalizeJson, normalizeOcrText, normalizeType, toNumber, flagFor } from "./normalization.service.js";
import { saveEncrypted, sha256 } from "./file-storage.service.js";
import { canReadPatient } from "../middleware/consent.js";
import { can } from "../constants/permissions.js";
import { awardForUpload } from "./credit.service.js";
import { notify } from "./notification.service.js";

const RECORDS = "records";
const PATIENTS = "patients";

async function requirePatient(patientId) {
  if (!patientId) throw httpError(400, "patientId is required");
  const patient = await getStore().get(PATIENTS, patientId);
  if (!patient) throw httpError(404, "Patient not found");
  return patient;
}

function withStatus(values) {
  if (values.some((v) => ["high", "low", "abnormal"].includes(v.flag))) return "abnormal";
  if (values.length) return "normal";
  return "unknown";
}

function normalizeManualValues(values = []) {
  return values.map((v) => {
    const value = toNumber(v.value);
    if (!v.name || value === null) throw httpError(400, "Every value needs a name and a number");
    const low = v.referenceLow ?? null;
    const high = v.referenceHigh ?? null;
    return {
      name: String(v.name).trim(),
      value,
      unit: v.unit ?? null,
      referenceLow: low,
      referenceHigh: high,
      flag: v.flag || flagFor(value, low ?? undefined, high ?? undefined),
    };
  });
}

function lifecycleSteps(normalized, hasUpload) {
  const steps = ["validating"];
  if (hasUpload && ["ocr", "pdf", "pdf_scan", "image"].includes(normalized.sourceFormat)) steps.push("ocr_processing");
  steps.push("normalizing");
  if (hasUpload) steps.push("encrypted");
  steps.push("stored");
  steps.push(normalized.needsReview ? "manual_review" : "accessible");
  const at = new Date();
  return steps.map((step) => ({ step, at }));
}

async function persistNormalized({ req, patientId, normalized, meta = {} }) {
  const history = lifecycleSteps(normalized, Boolean(meta.uploadId));
  const body = {
    lifecycleHistory: history,
    patientId,
    institutionId: req.user?.institutionId || req.affiliation?.institutionId || meta.institutionId || null,
    type: normalized.type,
    title: normalized.title,
    summary: normalized.summary || "",
    data: normalized.data || { values: [] },
    status: normalized.status || "unknown",
    lifecycle: normalized.needsReview ? "manual_review" : "accessible",
    source: req.user?.role === "lab_staff" ? "lab_upload" : "clinic",
    sourceFormat: normalized.sourceFormat || "manual",
    uploadId: meta.uploadId || null,
    originalFilename: meta.originalFilename || null,
    checksum: meta.checksum || null,
    confidence: normalized.confidence ?? null,
    reviewed: !normalized.needsReview,
    observedAt: normalized.observedAt || new Date().toISOString(),
  };
  const clean = validate(recordSchema, body);
  const record = await getStore().add(RECORDS, {
    ...clean,
    uploadedBy: req.user?.uid || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  if (!normalized.needsReview) {
    await awardForUpload(req.user, { resourceId: record.id });
    await notify({ userId: patientId, title: "New lab result available", body: record.title || "A new result was added to your record", type: "lab" });
    if (req.user?.uid) await notify({ userId: req.user.uid, title: "Upload linked to patient", body: record.title || "Your upload was linked successfully", type: "upload" });
  }
  await auditRequest(req, {
    action: "record_ingested",
    resourceType: "record",
    resourceId: record.id,
    patientId,
    metadata: {
      format: normalized.sourceFormat || "manual",
      confidence: normalized.confidence ?? null,
      needsReview: Boolean(normalized.needsReview),
      checksum: meta.checksum || null,
    },
  });
  return record;
}

/** Manual entry: staff types the values, so no review gate is needed. */
export async function ingestManual(req) {
  const body = validate(manualRecordSchema, req.body);
  await requirePatient(body.patientId);
  const values = normalizeManualValues(body.data?.values || []);
  if (!values.length) throw httpError(400, "At least one measured value is required");
  const normalized = {
    type: normalizeType(body.type),
    title: body.title,
    summary: values.map((v) => `${v.name}: ${v.value}${v.unit ? ` ${v.unit}` : ""}`).slice(0, 8).join("; "),
    observedAt: body.observedAt,
    data: { values },
    status: withStatus(values),
    confidence: 100,
    needsReview: false,
    sourceFormat: "manual",
  };
  return persistNormalized({ req, patientId: body.patientId, normalized, meta: { institutionId: body.institutionId } });
}

function detectFormat(file) {
  const name = String(file.originalname || "").toLowerCase();
  const mime = String(file.mimetype || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (name.endsWith(".pdf") || mime === "application/pdf") return "pdf";
  if (name.endsWith(".dcm") || mime === "application/dicom") return "dicom";
  if (name.endsWith(".csv") || mime === "text/csv") return "csv";
  if (name.endsWith(".json") || mime.includes("json") || name.endsWith(".fhir")) return "json";
  if (name.endsWith(".txt") || mime.startsWith("text/")) return "text";
  throw httpError(400, "Unsupported file type. Use PDF, image, CSV, JSON/FHIR, DICOM or text.");
}

async function parseFile(file) {
  const format = detectFormat(file);
  if (format === "image") {
    const ocr = await ocrText(file.buffer);
    return normalizeOcrText(ocr.text, { confidence: ocr.confidence, sourceFormat: "ocr" });
  }
  if (format === "pdf") {
    const { text } = await extractPdfText(file.buffer);
    if (!text.trim()) {
      // Scanned PDF: rasterize pages and run the same OCR pipeline as images.
      try {
        const pages = await rasterizePdf(file.buffer);
        const results = [];
        for (const png of pages) results.push(await ocrText(png));
        const combined = results.map((r) => r.text).filter(Boolean).join("\n");
        const confidence = results.length ? Math.min(...results.map((r) => r.confidence)) : 0;
        if (combined.trim()) return normalizeOcrText(combined, { confidence, sourceFormat: "pdf_ocr" });
      } catch {
        // Fall through to manual review if rasterization/OCR is unavailable.
      }
      return {
        type: "lab", title: "Scanned PDF (manual entry required)", summary: "OCR could not extract values",
        observedAt: new Date().toISOString(), data: { values: [] }, status: "needs_review",
        confidence: null, needsReview: true, sourceFormat: "pdf_scan",
      };
    }
    return normalizeOcrText(text, { confidence: 100, sourceFormat: "pdf" });
  }
  if (format === "dicom") return normalizeDicom(file.buffer);
  const text = file.buffer.toString("utf8");
  if (format === "csv") return normalizeCsv(text);
  if (format === "json") {
    try { return normalizeJson(text); }
    catch (error) {
      if (error?.status) throw error;
      throw httpError(400, `Invalid JSON/FHIR document: ${error.message}`);
    }
  }
  return normalizeOcrText(text, { confidence: 100, sourceFormat: "text" });
}

/** File ingestion: validates, checksums, normalizes, encrypts and links. */
export async function ingestFile(req) {
  const file = req.file;
  if (!file) throw httpError(400, "A file is required (multipart field: file)");
  if (file.size > env.uploadMaxBytes) throw httpError(400, `File exceeds the ${env.uploadMaxMb}MB limit`);
  const patientId = req.body?.patientId || req.params?.patientId;
  await requirePatient(patientId);

  const checksum = sha256(file.buffer);
  const normalized = await parseFile(file);
  const upload = await saveEncrypted({
    buffer: file.buffer,
    patientId,
    filename: file.originalname,
    mimeType: file.mimetype,
    uploadedBy: req.user?.uid,
    institutionId: req.user?.institutionId,
    checksum,
    format: normalized.sourceFormat,
  });
  const record = await persistNormalized({
    req,
    patientId,
    normalized,
    meta: { uploadId: upload.id, originalFilename: file.originalname, checksum },
  });
  return { record, upload, warnings: normalized.needsReview ? ["Low confidence or no structured values; manual review required"] : [] };
}

/** Human verification of a low-confidence extraction before it becomes visible. */
export async function reviewRecord(req) {
  const id = req.params.id;
  const record = await getStore().get(RECORDS, id);
  if (!record) throw httpError(404, "Record not found");
  if (record.status !== "needs_review" && record.lifecycle !== "manual_review") {
    throw httpError(409, "Only records awaiting review can be verified");
  }
  await canReadPatient(req, record.patientId, { scope: "records" });
  const body = validate(reviewSchema, req.body);
  const values = normalizeManualValues(body.values);
  const updated = await getStore().update(RECORDS, id, {
    data: { ...(record.data || {}), values },
    summary: values.map((v) => `${v.name}: ${v.value}${v.unit ? ` ${v.unit}` : ""}`).slice(0, 8).join("; "),
    status: withStatus(values),
    lifecycle: "accessible",
    lifecycleHistory: [...(record.lifecycleHistory || []), { step: "accessible", at: new Date() }],
    confidence: 100,
    reviewed: true,
    reviewedBy: req.user?.uid || null,
    reviewNote: body.note || null,
    updatedAt: new Date(),
  });
  await auditRequest(req, {
    action: "record_reviewed",
    resourceType: "record",
    resourceId: id,
    patientId: record.patientId,
    metadata: { values: values.length },
  });
  return updated;
}

/** List records the requester is allowed to see, hiding unreviewed data from patients. */
export async function listVisibleRecords(req, { type, patientId, limit, lifecycle } = {}) {
  const where = [];
  if (patientId) where.push({ field: "patientId", op: "==", value: patientId });
  if (type) where.push({ field: "type", op: "==", value: normalizeType(type) });
  const page = await getStore().query(RECORDS, {
    where,
    orderBy: [{ field: "observedAt", direction: "desc" }],
    limit,
  });
  const allowed = new Map();
  const items = [];
  for (const record of page.items) {
    if (record.lifecycle === "deleted") continue;
    const archived = record.lifecycle === "archived";
    if (lifecycle === "archived" ? !archived : archived) continue;
    if (req.user.role === "patient" && (record.status === "needs_review" || record.lifecycle === "manual_review")) continue;
    if (!allowed.has(record.patientId)) {
      let ok;
      try { await canReadPatient(req, record.patientId, { scope: "records" }); ok = true; } catch { ok = false; }
      allowed.set(record.patientId, ok);
    }
    if (allowed.get(record.patientId)) items.push(record);
  }
  return { items, nextCursor: page.nextCursor };
}

export async function getVisibleRecord(req, id) {
  const record = await getStore().get(RECORDS, id);
  if (!record || record.lifecycle === "deleted") throw httpError(404, "Record not found");
  if (req.user.role === "patient" && record.lifecycle === "archived") throw httpError(404, "Record not found");
  await canReadPatient(req, record.patientId, { scope: "records" });
  if (req.user.role === "patient" && (record.status === "needs_review" || record.lifecycle === "manual_review")) {
    throw httpError(404, "Record not found");
  }
  return record;
}

/**
 * Archiving follows the documented record lifecycle (Fig. 6): authorized staff
 * move older records to cold storage, where consented clinicians can still
 * read and restore them. Patients cannot modify clinical records.
 */
async function requireRecordWriter(req, id) {
  if (!can(req.user?.role, "records:write")) throw httpError(403, "Forbidden");
  const record = await getStore().get(RECORDS, id);
  if (!record || record.lifecycle === "deleted") throw httpError(404, "Record not found");
  await canReadPatient(req, record.patientId, { scope: "records" });
  return record;
}

export async function archiveRecord(req, id) {
  const record = await requireRecordWriter(req, id);
  if (record.lifecycle === "archived") throw httpError(409, "Record already archived");
  return getStore().update(RECORDS, id, {
    lifecycle: "archived",
    archivedAt: new Date(),
    archivedBy: req.user.uid,
    lifecycleHistory: [...(record.lifecycleHistory || []).slice(-19), { step: "archived", at: new Date() }],
    updatedAt: new Date(),
  });
}

export async function restoreRecord(req, id) {
  const record = await requireRecordWriter(req, id);
  if (record.lifecycle !== "archived") throw httpError(409, "Record is not archived");
  return getStore().update(RECORDS, id, {
    lifecycle: "accessible",
    archivedAt: null,
    archivedBy: null,
    lifecycleHistory: [...(record.lifecycleHistory || []).slice(-19), { step: "accessible", at: new Date() }],
    updatedAt: new Date(),
  });
}

export async function pendingReview() {
  const page = await getStore().query(RECORDS, {
    where: [{ field: "status", op: "==", value: "needs_review" }],
    orderBy: [{ field: "createdAt", direction: "desc" }],
    limit: 100,
  });
  page.items = page.items.filter((r) => r.lifecycle !== "deleted" && r.lifecycle !== "archived");
  return page;
}
