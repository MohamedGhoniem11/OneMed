/**
 * OneMed Cloud Functions (R3.3.2, §4.2.3).
 *
 * These functions keep Gemini credentials and guideline retrieval inside
 * Firebase, so the Express API never needs a cloud LLM key in production.
 * Requests are limited in size, origins are allowlisted, and no prompt content
 * or API keys are written to logs.
 */
import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();
setGlobalOptions({ region: "europe-west1", maxInstances: 10, timeoutSeconds: 30 });

const ALLOWED = (process.env.CORS_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const EMBED_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";

function cors(req, res) {
  const origin = req.headers.origin;
  if (!origin) return true;
  if (!ALLOWED.length || ALLOWED.includes(origin) || ALLOWED.includes("*")) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
    return true;
  }
  res.status(403).json({ message: "Origin not allowed" });
  return false;
}

function readBody(req, res) {
  const size = Number(req.headers["content-length"] || 0);
  if (!req.body || typeof req.body !== "object" || size > 256_000) {
    res.status(400).json({ message: "Invalid request body" });
    return null;
  }
  return req.body;
}

async function gemini(path, body) {
  if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY is not configured for Cloud Functions");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${path}:generateContent?key=${encodeURIComponent(GEMINI_KEY)}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  return json;
}

export const generate = onRequest({ cors: false }, async (req, res) => {
  if (req.method !== "POST" || !cors(req, res)) return;
  const body = readBody(req, res); if (!body) return;
  const { system, prompt, maxOutputTokens = 600 } = body;
  if (typeof system !== "string" || typeof prompt !== "string") {
    res.status(400).json({ message: "system and prompt are required" }); return;
  }
  try {
    const json = await gemini(MODEL, {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: Math.min(Number(maxOutputTokens) || 600, 2000), temperature: 0.2 },
    });
    const text = (json.candidates || []).map((c) => (c.content?.parts || []).map((p) => p.text || "").join("")).join("\n");
    res.json({ text, mode: "gemini-cloud" });
  } catch (error) {
    res.status(502).json({ message: error.message || "LLM request failed" });
  }
});

export const embed = onRequest({ cors: false }, async (req, res) => {
  if (req.method !== "POST" || !cors(req, res)) return;
  const body = readBody(req, res); if (!body) return;
  if (typeof body.text !== "string") { res.status(400).json({ message: "text is required" }); return; }
  if (!GEMINI_KEY) { res.status(503).json({ message: "GEMINI_API_KEY is not configured" }); return; }
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${encodeURIComponent(GEMINI_KEY)}`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: `models/${EMBED_MODEL}`, content: { parts: [{ text: body.text }] } }),
      signal: AbortSignal.timeout(20000),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Gemini embedding ${response.status}`);
    const values = json.embedding?.values || [];
    const norm = Math.sqrt(values.reduce((s, x) => s + x * x, 0)) || 1;
    res.json({ values: values.map((x) => x / norm), model: EMBED_MODEL });
  } catch (error) {
    res.status(502).json({ message: error.message || "Embedding request failed" });
  }
});

/** Retrieves top-K guideline chunks. Native vector index should be deployed in Firestore. */
export const searchGuidelines = onRequest({ cors: false }, async (req, res) => {
  if (req.method !== "POST" || !cors(req, res)) return;
  const body = readBody(req, res); if (!body) return;
  if (!Array.isArray(body.embedding) || !body.embedding.length) {
    res.status(400).json({ message: "embedding is required" }); return;
  }
  try {
    const snapshot = await getFirestore().collection("guidelineChunks").limit(500).get();
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const dot = (a, b) => a.reduce((sum, x, i) => sum + x * (b[i] || 0), 0);
    const scored = items
      .filter((item) => Array.isArray(item.embedding) && item.embedding.length === body.embedding.length)
      .map((item) => ({ ...item, score: dot(body.embedding, item.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(5, Number(body.limit) || 5));
    res.json({ chunks: scored });
  } catch (error) {
    res.status(502).json({ message: error.message || "Guideline search failed" });
  }
});
