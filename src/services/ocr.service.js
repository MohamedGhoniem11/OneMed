import { createWorker } from "tesseract.js";
import os from "os";
import path from "path";

// tesseract.js runs fully locally (WASM). The only network use is the one-time
// download of the language traineddata, which is then cached on disk.
// Bilingual by default (Arabic + English in one pass); override via TESSERACT_LANG.
const DEFAULT_LANG = process.env.TESSERACT_LANG || "ara+eng";
const CACHE_PATH =
  process.env.TESSERACT_CACHE_PATH || path.join(os.tmpdir(), "onemed-tesseract");

// One worker is reused across requests (createWorker is expensive). tesseract.js
// queues jobs, so concurrent recognize() calls are serialized internally.
let workerPromise = null;
let workerLang = null;

function buildWorker(lang) {
  const options = { cachePath: CACHE_PATH };
  // tesseract.js throws if `logger` is present but not a function, so add it only when debugging.
  if (process.env.OCR_DEBUG) {
    options.logger = (m) =>
      console.log(`[ocr] ${m.status} ${Math.round((m.progress || 0) * 100)}%`);
  }
  return createWorker(lang, 1, options);
}

async function getWorker(lang) {
  if (workerPromise && workerLang === lang) return workerPromise;
  if (workerPromise) {
    const old = await workerPromise.catch(() => null);
    if (old) await old.terminate().catch(() => {});
  }
  workerLang = lang;
  workerPromise = buildWorker(lang).catch((err) => {
    workerPromise = null;
    workerLang = null;
    throw err;
  });
  return workerPromise;
}

/**
 * Run OCR on an image buffer.
 * @param {Buffer} buffer raw image bytes (png/jpg/...)
 * @param {{ lang?: string }} [opts]
 * @returns {Promise<{ text: string, confidence: number|null, lang: string }>}
 */
export async function extractText(buffer, { lang = DEFAULT_LANG } = {}) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw Object.assign(new Error("image buffer is empty"), { status: 400 });
  }
  const worker = await getWorker(lang);
  const { data } = await worker.recognize(buffer);
  return {
    text: String(data.text || "").trim(),
    confidence:
      typeof data.confidence === "number" ? Math.round(data.confidence) : null,
    lang,
  };
}

/** Release the shared worker (call on shutdown). */
export async function terminateOcr() {
  if (!workerPromise) return;
  const worker = await workerPromise.catch(() => null);
  workerPromise = null;
  workerLang = null;
  if (worker) await worker.terminate().catch(() => {});
}

export { DEFAULT_LANG };
