import { getStore } from "../store/index.js";
import { httpError } from "../utils/http-error.js";
import { canReadPatient } from "../middleware/consent.js";
import { generate, llmMode } from "./llm.service.js";
import { valuesOf, dateOf } from "../utils/clinical-values.js";

const RECORDS = "records";
const PRESCRIPTIONS = "prescriptions";

const SUMMARY_SYSTEM = `You are a clinical navigation assistant. Summarize ONLY the structured patient data supplied to you.
Do not diagnose, do not recommend treatment, do not suggest medications, and do not invent facts.
Use short bullet-like sentences. State explicitly when data is missing.
End with the exact disclaimer: "AI-generated navigation aid only. Not medical advice."`;

function offlineSummary({ patient, records, prescriptions }) {
  const values = records.flatMap(valuesOf);
  const abnormal = values.filter((v) => ["high", "low", "abnormal"].includes(v.flag));
  const labs = records.filter((r) => r.type === "lab" || r.type === "vital").slice(0, 6);
  const meds = prescriptions.flatMap((rx) => (rx.items || rx.medicines || []).map((m) => m.name || m.medicine_name)).filter(Boolean);
  const lines = [
    `Patient: ${patient.name || patient.fullName || "unnamed"}.`,
    `Blood group: ${patient.bloodGroup || patient.blood_group || "not recorded"}.`,
    `Known allergies: ${(patient.allergies || []).join(", ") || "none recorded"}.`,
    `Chronic conditions: ${(patient.chronicDiseases || patient.chronic_conditions || []).join(", ") || "none recorded"}.`,
    `Recent abnormal results: ${abnormal.length ? abnormal.slice(0, 6).map((v) => `${v.name} ${v.value} ${v.unit || ""}`).join("; ") : "none flagged"}.`,
    `Latest observations: ${labs.length ? labs.map((r) => r.title || r.type).slice(0, 5).join("; ") : "no labs recorded"}.`,
    `Current/past medicines: ${meds.length ? [...new Set(meds)].slice(0, 10).join(", ") : "none recorded"}.`,
    "AI-generated navigation aid only. Not medical advice.",
  ];
  return lines.join("\n");
}

/** Grounded clinical summary with explicit confidence and sources (R18/R20/R21). */
export async function clinicalSummary(req, patientId) {
  const patient = await getStore().get("patients", patientId);
  if (!patient) throw httpError(404, "Patient not found");
  await canReadPatient(req, patientId, { scope: "records" });

  const recordsPage = await getStore().query(RECORDS, {
    where: [{ field: "patientId", op: "==", value: patientId }],
    orderBy: [{ field: "observedAt", direction: "desc" }],
    limit: 100,
  });
  const prescriptionsPage = await getStore().query(PRESCRIPTIONS, {
    where: [{ field: "patientId", op: "==", value: patientId }],
    limit: 100,
  });
  const records = recordsPage.items;
  const prescriptions = prescriptionsPage.items;
  if (!records.length && !prescriptions.length) {
    return {
      text: "No clinical data is available for this patient. AI-generated navigation aid only. Not medical advice.",
      confidence: "Knowledge Gap",
      sources: [],
      mode: llmMode(),
    };
  }

  const facts = {
    patient,
    records: records.slice(0, 20).map((r) => ({ title: r.title, type: r.type, date: dateOf(r), values: valuesOf(r), summary: r.summary })),
    prescriptions: prescriptions.slice(0, 10).map((rx) => ({ status: rx.status, items: rx.items || rx.medicines || [] })),
  };
  let text = offlineSummary(facts);
  if (llmMode() === "gemini") {
    try {
      const result = await generate({
        system: SUMMARY_SYSTEM,
        prompt: `Patient data (JSON):\n${JSON.stringify(facts, null, 2)}\n\nSummarize for clinical navigation.`,
        maxOutputTokens: 700,
      });
      if (result.text && result.text.toLowerCase().includes("not medical advice")) text = result.text;
    } catch {
      // Deterministic summary above remains the safe fallback.
    }
  }

  const sources = records.slice(0, 8).map((r) => `${r.title || r.type} (${String(dateOf(r) || "undated").slice(0, 10)})`);
  const confidence = records.length >= 5 ? "High" : records.length >= 2 ? "Moderate" : "Low";
  return {
    text,
    confidence,
    sources,
    mode: llmMode(),
    disclaimer: "AI-generated navigation aid only. Not medical advice.",
  };
}
