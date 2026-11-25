import "dotenv/config";
import { GUIDELINES } from "../src/data/guidelines.js";
import { getStore } from "../src/store/index.js";
import { embed, llmMode } from "../src/services/llm.service.js";

const store = getStore();
const vectors = await embed(GUIDELINES.map((g) => `${g.text} ${g.tags.join(" ")} ${g.section}`));
let added = 0;
for (let i = 0; i < GUIDELINES.length; i += 1) {
  const chunk = GUIDELINES[i];
  const existing = await store.get("guidelineChunks", chunk.id);
  const doc = { ...chunk, embedding: vectors[i], embeddingModel: llmMode() === "gemini" ? process.env.GEMINI_EMBEDDING_MODEL : "offline-256", updatedAt: new Date() };
  if (existing) await store.update("guidelineChunks", chunk.id, doc);
  else { await store.set("guidelineChunks", chunk.id, doc); added += 1; }
}
console.log(JSON.stringify({ total: GUIDELINES.length, added, mode: llmMode(), dimensions: vectors[0].length }));
