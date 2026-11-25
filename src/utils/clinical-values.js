/**
 * Normalizes the different value shapes used across ingestion sources into a
 * single array of { name, value, unit, flag, referenceLow, referenceHigh }.
 * Accepts: record.values[] | record.data.values[] | record.data{ name: value }.
 * Reference ranges are a documented, illustrative catalog (OQ17) used for
 * trend/flagging only; they are not a diagnostic device.
 */
export const REFERENCE_RANGES = Object.freeze({
  "HbA1c": { low: 4, high: 5.6, unit: "%" },
  "Glucose, Fasting": { low: 70, high: 100, unit: "mg/dL" },
  "Glucose": { low: 70, high: 140, unit: "mg/dL" },
  "Systolic": { low: 90, high: 120, unit: "mmHg" },
  "Diastolic": { low: 60, high: 80, unit: "mmHg" },
  "LDL": { low: 0, high: 100, unit: "mg/dL" },
  "HDL": { low: 40, high: 90, unit: "mg/dL" },
  "Total Cholesterol": { low: 0, high: 200, unit: "mg/dL" },
  "Triglycerides": { low: 0, high: 150, unit: "mg/dL" },
  "Creatinine": { low: 0.6, high: 1.2, unit: "mg/dL" },
  "Hemoglobin": { low: 12, high: 16, unit: "g/dL" },
  "WBC": { low: 4000, high: 11000, unit: "/µL" },
  "Platelets": { low: 150000, high: 400000, unit: "/µL" },
});

const LABELS = Object.freeze({
  hba1c: "HbA1c", glucose: "Glucose, Fasting", glucose_fasting: "Glucose, Fasting",
  systolic: "Systolic", diastolic: "Diastolic", ldl: "LDL", hdl: "HDL",
  total_cholesterol: "Total Cholesterol", cholesterol: "Total Cholesterol",
  triglycerides: "Triglycerides", creatinine: "Creatinine",
  hemoglobin: "Hemoglobin", wbc: "WBC", platelets: "Platelets",
});

function label(key) {
  return LABELS[String(key).toLowerCase().replace(/[\s-]+/g, "_")] || String(key);
}

function withRange(name, value, raw = {}) {
  const numeric = typeof value === "number" ? value : Number(value);
  const ref = REFERENCE_RANGES[name] || {};
  const low = raw.referenceLow ?? raw.low ?? ref.low;
  const high = raw.referenceHigh ?? raw.high ?? ref.high;
  let flag = raw.flag;
  if (!flag && Number.isFinite(numeric)) {
    if (typeof low === "number" && numeric < low) flag = "low";
    else if (typeof high === "number" && numeric > high) flag = "high";
    else flag = "normal";
  }
  return {
    name,
    value: Number.isFinite(numeric) ? numeric : value,
    unit: raw.unit ?? ref.unit ?? "",
    flag,
    referenceLow: low,
    referenceHigh: high,
  };
}

export function valuesOf(record) {
  if (!record) return [];
  if (Array.isArray(record.values)) return record.values.map((v) => withRange(v.name, v.value, v));
  if (Array.isArray(record.data?.values)) return record.data.values.map((v) => withRange(v.name, v.value, v));
  if (record.data && typeof record.data === "object") {
    return Object.entries(record.data)
      .filter(([, value]) => value !== null && value !== undefined && value !== "")
      .map(([key, value]) => {
        // Some sources store a {value, unit, flag} object per key.
        if (value && typeof value === "object" && "value" in value) return withRange(label(key), value.value, value);
        return withRange(label(key), value);
      });
  }
  return [];
}

export function dateOf(record) {
  return record?.observedAt || record?.date || record?.collectedAt || record?.createdAt || null;
}
