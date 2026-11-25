import { getStore } from "../store/index.js";
import { httpError } from "../utils/http-error.js";
import { valuesOf, dateOf } from "../utils/clinical-values.js";
import { embed, generate, llmMode, offlineRank, cosine } from "./llm.service.js";
import { auditRequest } from "./audit.service.js";

const SYSTEM = `You are a clinical navigation assistant inside a doctor's patient record.
Use ONLY the structured patient facts and guideline excerpts supplied in the prompt.
Summarise, retrieve and compare - never diagnose, never prescribe, never recommend treatment or medication.
If the supplied context is insufficient, reply exactly: "I cannot answer from the available patient data. Please review the source records."
Use short bullet-like sentences and end with: "Decision-support only. The treating doctor remains responsible for clinical decisions."`;

function confidenceLabel(score) {
  if (score >= 0.75) return "High";
  if (score >= 0.45) return "Moderate";
  if (score >= 0.2) return "Low";
  return "Knowledge Gap";
}

async function patientContext(patientId) {
  const patient = await getStore().get("patients", patientId);
  if (!patient) throw httpError(404, "Patient not found");
  const user = await getStore().get("users", patientId);
  const recordsPage = await getStore().query("records", {
    where: [{ field: "patientId", op: "==", value: patientId }],
    orderBy: [{ field: "observedAt", direction: "desc" }],
    limit: 30,
  });
  const prescriptions = await getStore().query("prescriptions", {
    where: [{ field: "patientId", op: "==", value: patientId }], limit: 30,
  });
  const latest = recordsPage.items.slice(0, 6).map((r) => ({
    title: r.title || r.type,
    date: dateOf(r),
    values: valuesOf(r).map((v) => ({ name: v.name, value: v.value, unit: v.unit, flag: v.flag })),
  }));
  const medicines = prescriptions.items.flatMap((rx) => (rx.items || rx.medicines || []).map((m) => m.name || m.medicine_name)).filter(Boolean);
  return {
    name: patient.name || user?.name || patientId,
    bloodGroup: patient.bloodGroup || null,
    allergies: patient.allergies || [],
    conditions: patient.chronicDiseases || patient.chronic_conditions || [],
    medications: [...new Set( medicines )],
    observations: latest,
  };
}

const DISCLAIMER = "Decision-support only. The treating doctor remains responsible for clinical decisions.";

/** Patient-scoped RAG assistant (R19, Algorithm 2). Never diagnoses or prescribes. */
export async function doctorChat(req, patientId, message, language = "en") {
  const text = String(message || "").trim();
  if (!text) throw httpError(400, "A message is required");
  const context = await patientContext(patientId);
  const chunksPage = await getStore().query("guidelineChunks", { limit: 500 });
  const chunks = chunksPage.items;
  const mode = llmMode();

  let hits;
  if (mode === "offline") {
    hits = offlineRank(text, chunks, 5);
  } else {
    const vectors = await embed([text]);
    hits = chunks.map((chunk) => ({ ...chunk, score: Array.isArray(chunk.embedding) ? cosine(vectors[0], chunk.embedding) : 0 }))
      .filter((chunk) => chunk.score > 0.28)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }
  const relevant = hits.filter((chunk) => chunk.language === language || chunk.language === "en").slice(0, 5);
  const topScore = relevant[0]?.score || 0;
  const hasNumbers = context.observations.some((o) => o.values.some((v) => typeof v.value === "number"));
  const score = 0.4 * Math.min(1, topScore / 0.5) + (hasNumbers ? 0.2 : 0.05) + 0.2 + (mode === "gemini" ? 0.2 : 0.1);
  const confidence = confidenceLabel(score);
  const sources = relevant.map((chunk) => `${chunk.source} §${chunk.section}`);
  const gap = confidence === "Knowledge Gap" || relevant.length === 0;
  const facts = JSON.stringify(context, null, 2);
  const excerpts = relevant.map((c) => `[${c.source} §${c.section}] ${c.text}`).join("\n");
  const prompt = `Doctor's question: ${text}\n\nPatient facts (JSON):\n${facts}\n\nGuideline excerpts:\n${excerpts || "none retrieved"}`;

  let answer;
  if (gap) {
    answer = "I cannot answer from the available patient data. Please review the source records.";
  } else if (mode === "gemini") {
    let generated = "";
    try {
      generated = (await generate({ system: SYSTEM, prompt, maxOutputTokens: 600 })).text || "";
    } catch {
      // Cloud failure degrades to the same deterministic extractive fallback.
    }
    answer = generated;
  }
  if (!answer) {
    // Deterministic extractive answer: quote the retrieved facts, no invention.
    const notable = context.observations.flatMap((o) => o.values)
      .filter((v) => v.flag === "high" || v.flag === "low").slice(0, 4)
      .map((v) => `${v.name}: ${v.value} ${v.unit} (${v.flag})`);
    answer = [
      `Patient: ${context.name} · blood group ${context.bloodGroup || "not recorded"}`,
      `Conditions: ${context.conditions.join(", ") || "none recorded"}`,
      `Allergies: ${context.allergies.join(", ") || "none recorded"}`,
      notable.length ? `Flagged observations: ${notable.join("; ")}` : "No flagged observations in the recent record.",
      relevant[0] ? `Relevant guideline: ${relevant[0].text}` : "",
    ].filter(Boolean).join("\n");
  }
  if (!answer.includes("responsible for clinical decisions")) answer += `\n${DISCLAIMER}`;

  await auditRequest(req, {
    action: "doctor_ai_query",
    resourceType: "ai",
    resourceId: patientId,
    patientId,
    purpose: "clinical_navigation",
    metadata: { confidence, sources, mode, questionLength: text.length },
  });

  return {
    role: "assistant",
    text: answer,
    confidence,
    sources,
    disclaimer: DISCLAIMER,
    mode,
    isKnowledgeGap: gap,
  };
}
