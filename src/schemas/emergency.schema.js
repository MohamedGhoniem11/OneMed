// emergencyQr/{autoId} — token hash only; the raw token is never stored (M4).
export const emergencyQrSchema = {
  collection: "emergencyQr",
  fields: {
    patientId: { type: "string", required: true },
    tokenHash: { type: "string", required: true, min: 32 },
    createdAt: { type: "timestamp", readOnly: true },
    expiresAt: { type: "timestamp" },
    revokedAt: { type: "timestamp", readOnly: true },
    scanCount: { type: "number", readOnly: true },
    lastScanAt: { type: "timestamp", readOnly: true },
  },
};
