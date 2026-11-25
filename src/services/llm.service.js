import { env } from "../config/env.js";

/**
 * LLM port. Gemini is used when GEMINI_API_KEY is configured; otherwise a
 * deterministic offline provider keeps the academic demo fully functional and
 * is explicitly labelled as such. No key or prompt content is logged.
 */
const base = "https://generativelanguage.googleapis.com/v1beta/models";

export const llmMode = () => (env.geminiApiKey ? "gemini" : "offline");

async function gemini(path, body, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/${path}?key=${env.geminiApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${json.error?.message || "request failed"}`);
    return json;
  } finally {
    clearTimeout(timer);
  }
}

function offlineEmbedding(text) {
  // Stable deterministic 256-dimension bag-of-words embedding for the demo path.
  const vector = new Array(256).fill(0);
  const stop = new Set(["what","is","the","a","an","of","to","and","or","i","my","for","in","on","with","does","do","can","you","your","is","are","patient","patients","person","situation","emergency","help","need","should","please","tell","me","about","this","that","has","have","may","might","could","who","when","where","why","how"]);
  const words = String(text || "").toLowerCase().split(/[^a-z0-9\u0600-\u06FF]+/).filter((w) => w && !stop.has(w));
  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i += 1) hash = (hash * 31 + word.charCodeAt(i)) >>> 0;
    vector[hash % vector.length] += 1;
  }
  const norm = Math.sqrt(vector.reduce((sum, x) => sum + x * x, 0)) || 1;
  return vector.map((x) => x / norm);
}

export async function embed(texts) {
  const list = Array.isArray(texts) ? texts : [texts];
  if (llmMode() === "offline") return list.map(offlineEmbedding);
  const results = [];
  for (const text of list) {
    const json = await gemini(`${env.geminiEmbeddingModel}:embedContent`, {
      model: `models/${env.geminiEmbeddingModel}`,
      content: { parts: [{ text }] },
    });
    const values = json.embedding?.values;
    if (!Array.isArray(values)) throw new Error("Gemini embedding response has no values");
    const norm = Math.sqrt(values.reduce((sum, x) => sum + x * x, 0)) || 1;
    results.push(values.map((x) => x / norm));
  }
  return results;
}

const STOP = new Set(["what","is","the","a","an","of","to","and","or","i","my","for","in","on","with","does","do","can","you","your","patient","patients","person","situation","emergency","help","need","should","please","tell","me","about","this","that","has","have","may","might","could","who","when","where","why","how","someone","there","their"]);
function tokens(text) {
  return String(text || "").toLowerCase().split(/[^a-z0-9\u0600-\u06FF]+/).filter((w) => w && !STOP.has(w));
}

/** Deterministic lexical ranking used when no LLM API key is configured. */
export function offlineRank(query, docs, limit = 5) {
  const q = new Set(tokens(query));
  return docs.map((doc) => {
    const hay = new Set(tokens(`${doc.text || ""} ${(doc.tags || []).join(" ")} ${doc.section || ""}`));
    let overlap = 0;
    for (const word of q) if (hay.has(word)) overlap += 1;
    const score = overlap / Math.max(1, Math.sqrt(q.size * hay.size));
    return { ...doc, score };
  }).filter((doc) => doc.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
}

export function cosine(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || !a.length || a.length !== b.length) return 0;
  return a.reduce((sum, x, i) => sum + x * (b[i] || 0), 0);
}

/** Grounded generation. The system prompt enforces the medical safety boundaries. */
export async function generate({ system, prompt, maxOutputTokens = 500 }) {
  if (llmMode() === "offline") {
    return { text: "", mode: "offline" };
  }
  const json = await gemini(`${env.geminiModel}:generateContent`, {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens, temperature: 0.2 },
  });
  const text = (json.candidates || [])
    .map((c) => c.content?.parts?.map((p) => p.text || "").join("") || "")
    .join("\n")
    .trim();
  return { text: text || "I cannot provide guidance for this situation. Please wait for emergency services.", mode: "gemini" };
}
