import { getStore } from "../store/index.js";
import { httpError } from "../utils/http-error.js";
import { canReadPatient } from "../middleware/consent.js";
import { valuesOf, dateOf } from "../utils/clinical-values.js";

const RECORDS = "records";
const PRESCRIPTIONS = "prescriptions";

function monthKey(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "unknown" : date.toISOString().slice(0, 7);
}
function latestByValue(records, name) {
  let best = null;
  for (const record of records) {
    for (const v of valuesOf(record)) {
      if (v.name !== name) continue;
      const when = new Date(dateOf(record) || 0).getTime();
      if (!best || when >= best.when) best = { value: v.value, unit: v.unit, flag: v.flag, low: v.referenceLow, high: v.referenceHigh, when };
    }
  }
  return best ? { value: best.value, unit: best.unit, flag: best.flag, low: best.low, high: best.high } : null;
}
function seriesFor(records, names) {
  return records.flatMap((r) => {
    const values = valuesOf(r);
    const picked = {};
    for (const name of names) {
      const found = values.find((v) => v.name === name);
      if (found) picked[name] = found.value;
    }
    if (!Object.keys(picked).length) return [];
    return [{ date: monthKey(dateOf(r)), ...picked }];
  });
}

/** Documented heuristic (OQ17): share of tracked indicators inside their range. */
function healthScore(indicators) {
  const known = indicators.filter((i) => i && typeof i.value === "number");
  if (!known.length) return 0;
  const inRange = known.filter((i) => {
    const low = typeof i.low === "number" ? i.low : -Infinity;
    const high = typeof i.high === "number" ? i.high : Infinity;
    return i.value >= low && i.value <= high;
  }).length;
  return Math.round((inRange / known.length) * 100);
}

export async function patientAnalytics(req, patientId) {
  const patient = await getStore().get("patients", patientId);
  if (!patient) throw httpError(404, "Patient not found");
  await canReadPatient(req, patientId, { scope: "records" });
  const recordsPage = await getStore().query(RECORDS, {
    where: [{ field: "patientId", op: "==", value: patientId }],
    limit: 500,
  });
  const prescriptionsPage = await getStore().query(PRESCRIPTIONS, {
    where: [{ field: "patientId", op: "==", value: patientId }],
    limit: 200,
  });
  const records = recordsPage.items.sort((a, b) => String(dateOf(a)).localeCompare(String(dateOf(b))));
  const prescriptions = prescriptionsPage.items;
  const indicators = {
    hba1c: latestByValue(records, "HbA1c"),
    glucose: latestByValue(records, "Glucose, Fasting") || latestByValue(records, "Glucose"),
    systolic: latestByValue(records, "Systolic"),
    diastolic: latestByValue(records, "Diastolic"),
    ldl: latestByValue(records, "LDL"),
    totalCholesterol: latestByValue(records, "Total Cholesterol"),
    hdl: latestByValue(records, "HDL"),
    creatinine: latestByValue(records, "Creatinine"),
  };
  const labTrends = seriesFor(records, ["HbA1c", "Glucose", "Glucose, Fasting", "Creatinine", "Hemoglobin"]);
  const bloodPressure = seriesFor(records, ["Systolic", "Diastolic"]);
  const lipidPanel = ["Total Cholesterol", "LDL", "HDL", "Triglycerides"].map((name) => ({ name, ...(latestByValue(records, name) || {}) }));
  const medications = prescriptions.flatMap((rx) => (rx.items || rx.medicines || []).map((m) => ({
    name: m.name,
    dosage: m.dose || m.dosage || "",
    frequency: m.frequency || "",
    duration: m.duration || "",
    status: rx.status,
  })));
  const visits = records.reduce((acc, r) => {
    const key = monthKey(dateOf(r));
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const abnormal = records.flatMap(valuesOf).filter((v) => ["high", "low", "abnormal"].includes(v.flag));
  const user = await getStore().get("users", patientId);
  return {
    patientId,
    patientName: patient.name || patient.fullName || user?.name || patientId,
    generatedAt: new Date().toISOString(),
    indicators,
    labTrends,
    bloodPressure,
    lipidPanel,
    medications,
    visits,
    conditions: patient.chronicDiseases || patient.chronic_conditions || [],
    allergies: patient.allergies || [],
    abnormalCount: abnormal.length,
    recordCount: records.length,
    healthScore: healthScore(Object.values(indicators)),
  };
}

/** De-identified aggregate for hospitals/MoH (R48). No names, IDs or phones. */
export async function populationAnalytics() {
  const [patientsPage, recordsPage] = await Promise.all([
    getStore().query("patients", { limit: 1000 }),
    getStore().query(RECORDS, { limit: 5000 }),
  ]);
  const cities = {};
  const conditions = {};
  for (const p of patientsPage.items) {
    const city = p.city || "unknown";
    cities[city] = (cities[city] || 0) + 1;
    for (const condition of p.chronicDiseases || p.chronic_conditions || []) {
      conditions[condition] = (conditions[condition] || 0) + 1;
    }
  }
  const labAverages = {};
  const labTotals = {};
  for (const r of recordsPage.items) {
    for (const v of valuesOf(r)) {
      if (typeof v.value !== "number") continue;
      labTotals[v.name] = (labTotals[v.name] || 0) + v.value;
      labAverages[v.name] = (labAverages[v.name] || 0) + 1;
    }
  }
  const averages = Object.fromEntries(Object.entries(labTotals).map(([k, sum]) => [k, Math.round((sum / labAverages[k]) * 100) / 100]));
  return {
    generatedAt: new Date().toISOString(),
    totalPatients: patientsPage.items.length,
    totalRecords: recordsPage.items.length,
    patientsByCity: cities,
    conditionCounts: conditions,
    labAverages: averages,
    visitsByMonth: recordsPage.items.reduce((acc, r) => {
      const key = monthKey(dateOf(r));
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
  };
}
