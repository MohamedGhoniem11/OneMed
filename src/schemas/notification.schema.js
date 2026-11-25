export const notificationSchema = {
  collection: "notifications",
  fields: {
    userId: { type: "string", required: true },
    title: { type: "string", required: true, max: 120 },
    body: { type: "string", max: 500 },
    type: { type: "string", enum: ["lab", "prescription", "message", "order", "system"] },
    read: { type: "boolean" },
    createdAt: { type: "timestamp", readOnly: true },
  },
};
