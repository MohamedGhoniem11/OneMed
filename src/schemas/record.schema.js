// records/{autoId} — labs, vitals, imaging, notes. `data` is type-specific.
export const recordTypes = Object.freeze(["lab", "vital", "imaging", "note"]);

export const recordSchema = {
  collection: "records",
  fields: {
    patientId: { type: "string", required: true },
    institutionId: { type: "string", max: 80 },
    type: { type: "string", required: true, enum: [...recordTypes] },
    title: { type: "string", required: true, max: 160 },
    summary: { type: "string", max: 1000 },
    data: { type: "object", additional: true, fields: {} },
    status: {
      type: "string",
      enum: ["normal", "monitor", "abnormal", "unknown"],
    },
    observedAt: { type: "timestamp", required: true },
    uploadedBy: { type: "string", readOnly: true },
    source: { type: "string", max: 80 },
    confidence: { type: "number", min: 0, max: 100 },
    reviewed: { type: "boolean" },
    createdAt: { type: "timestamp", readOnly: true },
    updatedAt: { type: "timestamp", readOnly: true },
  },
};
