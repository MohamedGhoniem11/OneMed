// guidelineChunks/{autoId} — curated first-aid KB with citations (OQ15).
export const guidelineChunkSchema = {
  collection: "guidelineChunks",
  fields: {
    source: { type: "string", required: true, max: 160 },
    section: { type: "string", required: true, max: 120 },
    url: { type: "string", max: 300 },
    language: { type: "string", required: true, enum: ["en", "ar"] },
    text: { type: "string", required: true, min: 20, max: 4000 },
    tags: { type: "array", of: { type: "string", max: 40 }, max: 20 },
    version: { type: "string", required: true, max: 30 },
    embedding: { type: "array", of: { type: "number" }, max: 2048 },
    createdAt: { type: "timestamp", readOnly: true },
  },
};
