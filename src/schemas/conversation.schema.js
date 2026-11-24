// conversations/{autoId} + messages/{autoId} (R32/R39)
export const conversationSchema = {
  collection: "conversations",
  fields: {
    patientId: { type: "string" },
    channel: { type: "string", enum: ["emergency", "doctor", "support"] },
    context: { type: "any" },
    startedAt: { type: "timestamp", readOnly: true },
    lastMessageAt: { type: "timestamp", readOnly: true },
  },
};

export const messageSchema = {
  collection: "messages",
  fields: {
    conversationId: { type: "string", required: true },
    role: { type: "string", required: true, enum: ["user", "assistant", "system"] },
    content: { type: "string", required: true, max: 8000 },
    citations: { type: "array", of: { type: "string", max: 300 }, max: 10 },
    createdAt: { type: "timestamp", readOnly: true },
  },
};
