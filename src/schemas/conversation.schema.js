// conversations/{autoId} + messages/{autoId} (R39).
export const conversationSchema = {
  collection: "conversations",
  fields: {
    patientId: { type: "string", required: true },
    otherUserId: { type: "string" },
    otherName: { type: "string", max: 100 },
    role: { type: "string", enum: ["doctor", "pharmacy", "support"] },
    updatedAt: { type: "timestamp" },
    createdAt: { type: "timestamp", readOnly: true },
  },
};

export const messageSchema = {
  collection: "messages",
  fields: {
    conversationId: { type: "string", required: true },
    senderId: { type: "string", required: true },
    text: { type: "string", required: true, max: 4000 },
    sentAt: { type: "timestamp" },
    type: { type: "string", enum: ["text", "system"] },
    createdAt: { type: "timestamp", readOnly: true },
  },
};
