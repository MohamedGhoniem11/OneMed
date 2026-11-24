import { env } from "../config/env.js";
import { httpError } from "../utils/http-error.js";

/**
 * Normalizes heterogeneous medical uploads into OneMed's canonical record shape.
 * No clinical interpretation: values, units and reference ranges are preserved
 * as written, flagged against the supplied range only (M2/R10/R11).
 */

const TYPE_ALIASES = Object.freeze({
  lab: "lab", labs: "lab", laboratory: "lab", result: "lab", results: "lab",
  imaging: "imaging", radiology: "imaging", scan: "imaging", dicom: "imaging",
  vital: "vital", vitals: "vital", observation: "vital",
  note: "note", notes: "note", clinical_note: "note",
  prescription: "prescription", rx: "prescription",
  visit: "visit", encounter: "visit",
});

const ARABIC_DIGITS = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};
const PERSIAN_DIGITS = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};

export function normalizeType(value, fallback = "lab") {
  const key = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return TYPE_ALIASES[key] || fallback;
}

export function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value === null || value === undefined) return null;
  const localized = String(value)
    .replace(/[٠-٩]/g, (d) => ARABIC_DIGITS[d])
    .replace(/[۰-۹]/g, (d) => PERSIAN_DIGITS[d])
    .replace(/٫/g, ".")
    .replace(/[٬,]/g, "");
  const match = localized.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

export function parseRange(text) {
  const value = String(text || "").replace(/[٠-٩]/g, (d) => ARABIC_DIGITS[d]);
  let match = value.match(/(-?\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(-?\d+(?:\.\d+)?)/i);
  if (match) return { referenceLow: Number(match[1]), referenceHigh: Number(match[2]) };
  match = value.match(/<\s*(\d+(?:\.\d+)?)/);
  if (match) return { referenceLow: 0, referenceHigh: Number(match[1]) };
  match = value.match(/>\s*(\d+(?:\.\d+)?)/);
  if (match) return { referenceLow: Number(match[1]), referenceHigh: 999999 };
  return null;
}

export function flagFor(value, low, high) {
  if (typeof value !== "number") return undefined;
  if (typeof low === "number" && value < low) return "low";
  if (typeof high === "number" && value > high) return "high";
  return "normal";
}

function cleanName(value) {
  return String(value || "")
    .replace(/[٬,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeRows(rows) {
  const values = rows
    .map((row) => {
      const name = cleanName(row.name);
      const value = toNumber(row.value);
      if (!name || value === null) return null;
      const range = row.referenceText ? parseRange(row.referenceText) : null;
      const referenceLow = row.referenceLow !== null && row.referenceLow !== undefined ? toNumber(row.referenceLow) : (range?.referenceLow ?? null);
      const referenceHigh = row.referenceHigh !== null && row.referenceHigh !== undefined ? toNumber(row.referenceHigh) : (range?.referenceHigh ?? null);
      return {
        name,
        value,
        unit: String(row.unit || "").trim() || null,
        referenceLow,
        referenceHigh,
        flag: row.flag || flagFor(value, referenceLow ?? undefined, referenceHigh ?? undefined),
      };
    })
    .filter(Boolean);
  return values;
}

function summarize(values) {
  if (!values.length) return "";
  return values
    .slice(0, 8)
    .map((v) => `${v.name}: ${v.value}${v.unit ? ` ${v.unit}` : ""}${v.flag && v.flag !== "normal" ? ` [${v.flag}]` : ""}`)
    .join("; ");
}

function statusFor(values, confidence, needsReview) {
  if (needsReview) return "needs_review";
  if (values.some((v) => v.flag === "high" || v.flag === "low" || v.flag === "abnormal")) return "abnormal";
  if (values.length) return "normal";
  return "unknown";
}

function buildResult({ rows, type = "lab", title, observedAt, confidence = null, needsReview = false, sourceFormat, extra = {} }) {
  const values = normalizeRows(rows);
  return {
    type: normalizeType(type),
    title: cleanName(title) || "Medical record",
    summary: summarize(values),
    observedAt: observedAt || new Date().toISOString(),
    data: { values, ...extra },
    status: statusFor(values, confidence, needsReview),
    confidence: typeof confidence === "number" ? Math.round(confidence) : null,
    needsReview,
    sourceFormat,
  };
}

// --- CSV / TSV ---------------------------------------------------------------
function splitCsvLine(line, delimiter) {
  const out = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { field += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      out.push(field.trim()); field = "";
    } else field += char;
  }
  out.push(field.trim());
  return out;
}

const HEADERS = {
  name: ["test", "test_name", "testname", "name", "analysis", "indicator", "investigation", "الاسم", "التحليل"],
  value: ["value", "result", "reading", "النتيجة", "القيمة"],
  unit: ["unit", "units", "الوحدة"],
  range: ["range", "reference", "reference_range", "ref", "normal_range", "المدى"],
  low: ["low", "reference_low", "min"],
  high: ["high", "reference_high", "max"],
};

function findHeader(headers, candidates) {
  return headers.findIndex((header) => candidates.includes(String(header).toLowerCase().replace(/\s+/g, "_")));
}

export function normalizeCsv(text, { type = "lab", title = "Batch lab import" } = {}) {
  const lines = String(text || "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw httpError(400, "CSV must contain a header and at least one row");
  const first = lines[0];
  const delimiter = [",", ";", "\t"].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const headers = splitCsvLine(first, delimiter).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const nameIdx = findHeader(headers, HEADERS.name);
  const valueIdx = findHeader(headers, HEADERS.value);
  if (nameIdx < 0 || valueIdx < 0) throw httpError(400, "CSV needs test/name and value/result columns");
  const unitIdx = findHeader(headers, HEADERS.unit);
  const rangeIdx = findHeader(headers, HEADERS.range);
  const lowIdx = findHeader(headers, HEADERS.low);
  const highIdx = findHeader(headers, HEADERS.high);
  const rows = lines.slice(1).map((line) => {
    const cells = splitCsvLine(line, delimiter);
    return {
      name: cells[nameIdx], value: cells[valueIdx], unit: unitIdx >= 0 ? cells[unitIdx] : "",
      referenceText: rangeIdx >= 0 ? cells[rangeIdx] : "",
      referenceLow: lowIdx >= 0 ? toNumber(cells[lowIdx]) : null,
      referenceHigh: highIdx >= 0 ? toNumber(cells[highIdx]) : null,
    };
  });
  return buildResult({ rows, type, title, sourceFormat: "csv" });
}

// --- JSON / FHIR -------------------------------------------------------------
function observationToRow(resource) {
  const coding = resource.code?.coding?.[0]?.display || resource.code?.text || resource.code?.coding?.[0]?.code;
  const quantity = resource.valueQuantity || resource.valueNumber || {};
  const range = resource.referenceRange?.[0];
  return {
    name: coding,
    value: quantity.value ?? resource.valueString,
    unit: quantity.unit,
    referenceLow: range?.low?.value ?? null,
    referenceHigh: range?.high?.value ?? null,
  };
}

export function normalizeJson(payload, { type = "lab", title = "Structured lab import" } = {}) {
  const data = typeof payload === "string" ? JSON.parse(payload) : payload;
  if (!data || typeof data !== "object") throw httpError(400, "JSON payload must be an object or array");

  const resources = [];
  if (data.resourceType === "Bundle") {
    for (const entry of data.entry || []) if (entry.resource) resources.push(entry.resource);
  } else if (Array.isArray(data)) resources.push(...data.filter((x) => x && typeof x === "object"));
  else if (data.resourceType) resources.push(data);

  const observations = resources.filter((r) => r.resourceType === "Observation" && r.valueQuantity);
  if (observations.length) {
    const diagnostic = resources.find((r) => r.resourceType === "DiagnosticReport");
    return buildResult({
      rows: observations.map(observationToRow),
      type: diagnostic?.code?.text || type,
      title: cleanName(diagnostic?.code?.text) || title,
      observedAt: observations[0].effectiveDateTime || diagnostic?.effectiveDateTime,
      sourceFormat: "fhir",
      extra: { fhir: true },
    });
  }

  if (Array.isArray(data)) {
    return buildResult({ rows: data, type, title, sourceFormat: "json" });
  }
  const list = data.results || data.tests || data.observations || data.values || data.records;
  if (Array.isArray(list)) {
    return buildResult({ rows: list, type: data.type || type, title: data.title || title, observedAt: data.observedAt, sourceFormat: "json" });
  }
  // Object of {TestName: value} pairs.
  const rows = Object.entries(data)
    .filter(([key]) => !["title", "type", "observedAt", "patientId"].includes(key))
    .map(([name, value]) => (typeof value === "object" ? { name, ...value } : { name, value }));
  if (!rows.length) throw httpError(400, "JSON payload has no recognizable results");
  return buildResult({ rows, type: data.type || type, title: data.title || title, observedAt: data.observedAt, sourceFormat: "json" });
}

// --- OCR text ----------------------------------------------------------------
export function normalizeOcrText(text, { confidence = null, type = "lab", title = "Scanned report", sourceFormat = "ocr" } = {}) {
  const needsReview = typeof confidence === "number" && confidence < env.ocrConfidenceThreshold;
  const rows = [];
  const valueRegex = /([\p{L}\p{M}][\p{L}\p{M}\s,()/-]{1,60}?)\s+(-?\d+(?:[.,]\d+)?)\s*([a-zA-Z%^/\d]{0,24})\s*(?:\(?\s*(-?\d+(?:[.,]\d+)?)\s*(?:-|–)\s*(-?\d+(?:[.,]\d+)?)\s*\)?)?/gu;
  const headerWords = /patient|date|name|identification|laboratory|hospital|clinic|report|signature|page|telephone|tel\b/i;
  for (const match of String(text || "").matchAll(valueRegex)) {
    const name = cleanName(match[1]);
    if (!name || headerWords.test(name)) continue;
    rows.push({
      name, value: match[2], unit: match[3],
      referenceLow: match[4] ?? null, referenceHigh: match[5] ?? null,
    });
  }
  return buildResult({ rows, type, title, confidence, needsReview: needsReview || rows.length === 0, sourceFormat });
}

// --- DICOM metadata ----------------------------------------------------------
const DICOM_TAGS = Object.freeze({
  0x00080060: "modality",
  0x00080020: "studyDate",
  0x00080030: "studyTime",
  0x00080018: "sopInstanceUid",
  0x00081030: "studyDescription",
  0x00100010: "patientName",
  0x00100020: "patientId",
});
const LONG_VR = new Set(["OB", "OD", "OF", "OL", "OV", "OW", "SQ", "UC", "UR", "UT", "UN"]);

export function normalizeDicom(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 132 || buffer.subarray(128, 132).toString("ascii") !== "DICM") {
    throw httpError(400, "Not a valid DICOM file (missing DICM preamble)");
  }
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const metadata = {};
  let offset = 132;
  while (offset + 8 <= buffer.length) {
    const group = view.getUint16(offset, true);
    const element = view.getUint16(offset + 2, true);
    const tag = (group << 16) | element;
    if (group === 0x0002 && tag !== 0x00020010) { // skip file meta except transfer syntax
      offset += 8;
      continue;
    }
    const vr = buffer.subarray(offset + 4, offset + 6).toString("ascii");
    if (!/^[A-Z]{2}$/.test(vr)) break;
    const long = LONG_VR.has(vr);
    const length = long ? view.getUint32(offset + 12, true) : view.getUint16(offset + 6, true);
    const valueStart = offset + (long ? 20 : 8);
    if (length > buffer.length - valueStart) break;
    const key = DICOM_TAGS[tag];
    if (key) metadata[key] = buffer.subarray(valueStart, valueStart + length).toString("utf8").replace(/\0+$/, "").trim();
    if (group > 0x0020) break;
    offset = valueStart + length;
  }
  if (!metadata.modality && !metadata.studyDate) throw httpError(400, "DICOM has no readable study metadata");
  const date = /^(\d{4})(\d{2})(\d{2})$/.exec(metadata.studyDate || "");
  const observedAt = date ? `${date[1]}-${date[2]}-${date[3]}T${(metadata.studyTime || "000000").slice(0, 2)}:${(metadata.studyTime || "000000").slice(2, 4)}:00.000Z` : undefined;
  return {
    type: "imaging",
    title: metadata.studyDescription || `${metadata.modality || "DICOM"} study`,
    summary: `Modality ${metadata.modality || "unknown"}; SOP ${metadata.sopInstanceUid || "unknown"}`,
    observedAt,
    data: { values: [], dicom: metadata },
    status: "normal",
    confidence: null,
    needsReview: false,
    sourceFormat: "dicom",
  };
}
