// accessLog/{autoId} — append-only, SHA-256 hash-chained audit entries (R25).
export const auditSchema = {
  collection: "accessLog",
  fields: {
    seq: { type: "number", required: true },
    actorId: { type: "string" },
    actorRole: { type: "string" },
    action: { type: "string", required: true, max: 80 },
    resourceType: { type: "string", max: 60 },
    resourceId: { type: "string", max: 100 },
    patientId: { type: "string", max: 100 },
    purpose: { type: "string", max: 300 },
    ip: { type: "string", max: 60 },
    userAgent: { type: "string", max: 300 },
    metadata: { type: "any" },
    prevHash: { type: "string", required: true },
    hash: { type: "string", required: true },
    createdAt: { type: "timestamp", readOnly: true },
  },
};
