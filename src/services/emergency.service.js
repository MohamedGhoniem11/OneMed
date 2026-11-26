import { getStore } from "../store/index.js";
import { httpError } from "../utils/http-error.js";
import { auditRequest } from "./audit.service.js";
import { resolveEmergency } from "./token.service.js";
import { embed, generate, llmMode, offlineRank } from "./llm.service.js";
import { classify, safeReply, systemRules } from "./ai-policy.service.js";

const PATIENTS = "patients";
const CHUNKS = "guidelineChunks";

export const DEFAULT_PRIVACY = Object.freeze({
  showBloodType: true,
  showAllergies: true,
  showConditions: true,
  showMedications: false,
  showContacts: true,
  aiChatbotEnabled: true,
});

function privacyOf(patient) {
  const p = patient?.privacy || {};
  return {
    showBloodType: p.showBloodGroup ?? p.showBloodType ?? DEFAULT_PRIVACY.showBloodType,
    showAllergies: p.showAllergies ?? DEFAULT_PRIVACY.showAllergies,
    showConditions: p.showChronicConditions ?? p.showConditions ?? DEFAULT_PRIVACY.showConditions,
    showMedications: p.showMedications ?? DEFAULT_PRIVACY.showMedications,
    showContacts: p.showEmergencyContacts ?? p.showContacts ?? DEFAULT_PRIVACY.showContacts,
    aiChatbotEnabled: p.aiChatbotEnabled ?? DEFAULT_PRIVACY.aiChatbotEnabled,
  };
}

async function displayName(patient) {
  if (patient.name || patient.fullName) return patient.name || patient.fullName;
  const user = await getStore().get("users", patient.id);
  return user?.name || "OneMed patient";
}

async function resolvePatient(token, req) {
  let resolved;
  try { resolved = await resolveEmergency(token); }
  catch (error) { throw httpError(error.status || 400, "Invalid or unknown emergency QR token"); }
  const patient = await getStore().get(PATIENTS, resolved.patientId);
  if (!patient) throw httpError(404, "Patient not found");
  if (req) {
    await auditRequest(req, {
      action: "emergency_page_viewed",
      resourceType: "emergency",
      resourceId: resolved.record.id,
      patientId: patient.id,
      actorId: null,
      actorRole: "public",
      metadata: { scanCount: resolved.record.scanCount },
    });
  }
  return { patient, record: resolved.record };
}

/** Public emergency profile: only fields the patient explicitly approved. */
export async function publicProfile(token, req) {
  const { patient } = await resolvePatient(token, req);
  const privacy = privacyOf(patient);
  const visible = { patientName: await displayName(patient) };
  if (privacy.showBloodType) visible.bloodGroup = patient.bloodGroup || null;
  if (privacy.showAllergies) visible.allergies = patient.allergies || [];
  if (privacy.showConditions) visible.chronicConditions = patient.chronicDiseases || [];
  if (privacy.showMedications) visible.medications = patient.activeMedications || [];
  if (privacy.showContacts) {
    visible.emergencyContacts = patient.emergencyContacts || (patient.emergencyContact ? [patient.emergencyContact] : []);
    visible.primaryPhysician = patient.primaryPhysician || null;
    visible.primaryPhysicianPhone = patient.primaryPhysicianPhone || null;
  }
  return { visible, settings: privacy, language: "en" };
}

function approvedContext(patient) {
  const privacy = privacyOf(patient);
  const parts = [`Patient: ${patient.name || " unnamed "}`];
  if (privacy.showBloodType && patient.bloodGroup) parts.push(`Blood group: ${patient.bloodGroup}`);
  if (privacy.showAllergies && patient.allergies?.length) parts.push(`Known allergies: ${patient.allergies.join(", ")}`);
  if (privacy.showConditions && patient.chronicDiseases?.length) parts.push(`Chronic conditions: ${patient.chronicDiseases.join(", ")}`);
  if (privacy.showMedications && patient.activeMedications?.length) parts.push(`Current medications: ${patient.activeMedications.join(", ")}`);
  return parts.join(". ") + ".";
}

function systemPrompt(language) {
  const lead = language === "ar"
    ? 'ابدأ دائماً بـ: "اتصل بخدمات الطوارئ (١٢٣) فوراً إن لم تكن قد فعلت ذلك."'
    : 'ALWAYS begin your answer with: "Call emergency services (123) immediately if you have not already."';
  const tail = language === "ar"
    ? 'اختم بـ: "هذه إرشادات مؤقتة حتى وصول المساعدة المتخصصة." واذكر المصدر.'
    : 'End with: "This guidance is for temporary assistance only until professional help arrives." and cite the source.';
  return `${systemRules("public-first-aid", language)} ${lead} Use short numbered steps, one sentence per step, based ONLY on the supplied guideline context. If the context does not cover the question, ask one short follow-up; never refuse a possible emergency and always tell the user to call 123. ${tail}`;
}

function confidenceFor(topScore, mode = llmMode()) {
  if (mode === "offline") {
    if (topScore >= 0.3) return "High";
    if (topScore >= 0.12) return "Moderate";
    return "Knowledge Gap";
  }
  if (topScore >= 0.75) return "High";
  if (topScore >= 0.45) return "Moderate";
  return "Knowledge Gap";
}

function offlineAnswer(chunks, context, language) {
  if (!chunks.length) return "I cannot provide guidance for this situation. Please wait for emergency services.";
  const arabic = language === "ar";
  const lead = arabic ? "اتصل بالإسعاف (١٢٣) فوراً إن لم تكن قد فعلت ذلك." : "Call emergency services (123) immediately if you have not already.";
  const steps = chunks.slice(0, 3).map((c, i) => `${i + 1}. ${c.text}`).join("\n");
  const tail = arabic ? "هذه إرشادات مؤقتة حتى وصول المساعدة المتخصصة." : "This guidance is for temporary assistance only until professional help arrives.";
  return `${lead}\n\nPatient context: ${context}\n\n${steps}\n\n${tail}`;
}

/** Grounded first-aid response with citations, confidence and a hard knowledge-gap fallback. */
export async function chat(token, message, { req, language = "en" } = {}) {
  if (!String(message || "").trim()) throw httpError(400, "A message is required");
  const { patient, record } = await resolvePatient(token, req);
  if (privacyOf(patient).aiChatbotEnabled === false) {
    throw httpError(403, "The patient has disabled the emergency AI chatbot");
  }
  const context = approvedContext({ ...patient, name: await displayName(patient) });
  const mode = llmMode();
  const disclaimer = language === "ar"
    ? "إرشادات إسعافات أولية فقط، وليست بديلاً عن الرعاية الطبية. اتصل بالإسعاف (١٢٣)."
    : "First-aid guidance only, not a substitute for professional medical care. Call emergency services (123).";
  const decision = classify(message, "public-first-aid");
  if (decision.scope !== "first_aid") {
    const text = decision.scope === "emergency"
      ? safeReply("emergency", language)
      : decision.scope === "unclear" ? safeReply("unclear", language) : safeReply("firstAidOutOfScope", language);
    const response = {
      text, confidence: decision.scope === "emergency" ? "High" : "Knowledge Gap",
      sources: [], disclaimer, mode: "policy", scope: decision.scope, followUp: decision.followUp,
    };
    await auditRequest(req, {
      action: "emergency_chat", resourceType: "emergency", resourceId: record.id, patientId: patient.id,
      actorId: null, actorRole: "public",
      metadata: { scope: decision.scope, mode: "policy", language },
    });
    return response;
  }
  let hits;
  if (mode === "offline") {
    const all = await getStore().query(CHUNKS, { limit: 500 });
    hits = offlineRank(message, all.items, 5);
  } else {
    const embedded = await embed([String(message)]);
    hits = await getStore().vectorSearch(CHUNKS, embedded[0], { limit: 5 });
  }
  const model = mode === "gemini" ? process.env.GEMINI_EMBEDDING_MODEL : "offline-256";
  const minScore = mode === "offline" ? 0.12 : 0.28;
  const chunks = hits
    .filter((h) => (mode === "offline" || (h.embeddingModel || "") === model) && h.score > minScore
      && (h.language === language || (language === "ar" && h.language === "en")))
    .sort((a, b) => (a.language === language ? 0 : 1) - (b.language === language ? 0 : 1));
  const confidence = confidenceFor(chunks[0]?.score || 0, mode);

  let text;
  let degraded = false;
  let result;
  if (confidence === "Knowledge Gap") {
    text = safeReply("knowledgeGap", language);
  } else {
    const sources = chunks.map((c, i) => `[${i + 1}] ${c.source} - ${c.section}\n${c.text}`).join("\n\n");
    const prompt = `Bystander question: ${message}\n\nApproved patient context: ${context}\n\nGuideline context:\n${sources}\n\nAnswer in ${language === "ar" ? "Arabic (keep medicine names in Latin script)" : "English"}.`;
    try {
      result = await generate({ system: systemPrompt(language), prompt, maxOutputTokens: 1600 });
      if (mode === "gemini" && !result.text) degraded = true;
    } catch {
      // Cloud failure must not turn an emergency request into a 500, but the
      // response must be labelled as a fallback and offer a retry.
      degraded = true;
    }
    text = result?.text || offlineAnswer(chunks, context, language);
    if (result?.mode === "gemini" && !text.includes("123") && !text.includes("١٢٣")) {
      text = offlineAnswer(chunks, context, language);
      degraded = true;
    }
  }

  const response = {
    text,
    confidence,
    sources: chunks.map((c) => `${c.source} - ${c.section}`),
    disclaimer,
    mode: degraded ? "fallback" : (result?.mode || llmMode()),
    scope: decision.scope,
    ...(degraded ? {
      error: language === "ar" ? "تعذّر الاتصال بخدمة الذكاء الاصطناعي. يمكنك إعادة المحاولة." : "The AI service is temporarily unavailable. Please retry.",
      retryable: true,
    } : {}),
  };
  await auditRequest(req, {
    action: "emergency_chat",
    resourceType: "emergency",
    resourceId: record.id,
    patientId: patient.id,
    actorId: null,
    actorRole: "public",
    metadata: { confidence, sources: response.sources, mode: response.mode, scope: decision.scope, degraded, language },
  });
  return response;
}

export async function updatePrivacy(patientId, settings) {
  const patient = await getStore().get(PATIENTS, patientId);
  if (!patient) throw httpError(404, "Patient not found");
  const current = privacyOf(patient);
  const merged = { ...current };
  for (const key of Object.keys(DEFAULT_PRIVACY)) if (settings[key] !== undefined) merged[key] = Boolean(settings[key]);
  return getStore().update(PATIENTS, patientId, {
    privacy: {
      ...(patient.privacy || {}),
      showBloodGroup: merged.showBloodType,
      showAllergies: merged.showAllergies,
      showChronicConditions: merged.showConditions,
      showMedications: merged.showMedications,
      showEmergencyContacts: merged.showContacts,
      aiChatbotEnabled: merged.aiChatbotEnabled,
    },
    updatedAt: new Date(),
  });
}
