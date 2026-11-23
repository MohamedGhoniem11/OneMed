const HEADER =
  /^(?:dr\.?|doctor|clinic|hospital|center|centre|date|patient|name|diagnosis|address|phone|tel|rx|prescription|age|sex|gender|signature|notes?)\b/i;
const BULLET = /^\s*(?:\d{1,2}\s*[).:-]|[-•*·])\s*/;

const DOSE = /\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|ug|g|ml|cc|iu|units?|%)\b/i;
const FREQ_X = /\b\d+\s*[x×]\s*\d+\b/i;
const FREQ_WORD =
  /\b(?:once daily|twice daily|three times daily|once a day|twice a day|every\s+\d+\s*(?:h|hr|hrs|hours?)|once|twice|thrice|daily|od|bd|bid|tds|tid|qid|qds|qhs|nocte|prn)\b/i;
const FREQ_AR = /(?:مرة|مرتين|ثلاث\s*مرات|يوميا|يومياً)/;
const DURATION = /\b\d+\s*(?:days?|weeks?|wks?|months?|d)\b/i;
const DURATION_AR = /لمدة\s*\d+/;

function earliestMatch(text, patterns) {
  let best = null;
  for (const re of patterns) {
    const m = re.exec(text);
    if (m && (best === null || m.index < best.index)) {
      best = { index: m.index, value: m[0].trim() };
    }
  }
  return best;
}

function cleanName(raw) {
  return raw
    .replace(/[\s\-–—:,.()]+$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function parseLine(line) {
  const text = line.replace(BULLET, "").trim();
  if (!text || text.length < 3 || !/[A-Za-z\u0600-\u06FF]/.test(text)) return null;

  const dose = earliestMatch(text, [DOSE]);
  const frequency = earliestMatch(text, [FREQ_X, FREQ_WORD, FREQ_AR]);
  const duration = earliestMatch(text, [DURATION, DURATION_AR]);

  const boundaries = [dose, frequency, duration]
    .filter(Boolean)
    .map((m) => m.index);
  const cut = boundaries.length ? Math.min(...boundaries) : text.length;
  const name = cleanName(text.slice(0, cut));

  if (!name) return null;

  const hasPosology = Boolean(dose || frequency || duration);
  return {
    name,
    dose: dose?.value || "",
    frequency: frequency?.value || "",
    duration: duration?.value || "",
    notes: text,
    needsReview: !hasPosology,
  };
}

export function parse(rawText, { confidence = null } = {}) {
  const items = [];
  const warnings = [];

  const lines = String(rawText || "")
    .split(/\r?\n/)
    .map((l) => l.replace(/\u00a0/g, " ").trim())
    .filter(Boolean);

  for (const line of lines) {
    if (HEADER.test(line)) continue;
    const item = parseLine(line);
    if (!item) continue;
    items.push(item);
    if (item.needsReview) warnings.push(`No dosage detected, verify manually: "${line}"`);
  }

  if (items.length === 0) warnings.push("No medicine lines detected in the document.");
  if (typeof confidence === "number" && confidence < 60) {
    warnings.push(`Low OCR confidence (${confidence}%) - please verify the extracted text.`);
  }

  return { items, warnings };
}
