// records/{autoId} — labs, vitals, imaging, prescriptions, notes and visits.
// `data` is type-specific and holds normalized values plus provenance.
export const recordTypes = Object.freeze([
  "lab", "vital", "imaging", "prescription", "note", "visit",
]);

export const recordStatuses = Object.freeze([
  "normal", "monitor", "abnormal", "unknown", "needs_review",
]);

export const recordLifecycle = Object.freeze([
  "validating", "ocr_processing", "manual_review", "normalizing",
  "encrypted", "stored", "accessible", "archived", "deleted",
]);

export const recordSchema = {
  collection: "records",
  fields: {
    patientId: { type: "string", required: true },
    institutionId: { type: "string", max: 80 },
    type: { type: "string", required: true, enum: [...recordTypes] },
    title: { type: "string", required: true, max: 160 },
    summary: { type: "string", max: 1000 },
    data: { type: "object", additional: true, fields: {} },
    status: { type: "string", enum: [...recordStatuses] },
    lifecycle: { type: "string", enum: [...recordLifecycle] },
    observedAt: { type: "timestamp", required: true },
    uploadedBy: { type: "string", readOnly: true },
    source: { type: "string", max: 80 },
    sourceFormat: { type: "string", max: 40 },
    uploadId: { type: "string", max: 80 },
    originalFilename: { type: "string", max: 160 },
    checksum: { type: "string", max: 64 },
    confidence: { type: "number", min: 0, max: 100 },
    reviewed: { type: "boolean" },
    reviewedBy: { type: "string", max: 80 },
    createdAt: { type: "timestamp", readOnly: true },
    updatedAt: { type: "timestamp", readOnly: true },
  },
};

/** Manual entry payload: only the fields a staff member actually types. */
export const manualRecordSchema = {
  fields: {
    patientId: { type: "string", required: true },
    institutionId: { type: "string", max: 80 },
    type: { type: "string", required: true, enum: [...recordTypes] },
    title: { type: "string", required: true, max: 160 },
    summary: { type: "string", max: 1000 },
    observedAt: { type: "timestamp", required: true },
    data: { type: "object", additional: true, fields: {} },
  },
};

/** Manual review of a low-confidence extraction. */
export const reviewSchema = {
  fields: {
    values: {
      type: "array",
      required: true,
      min: 1,
      max: 200,
      of: {
        type: "object",
        fields: {
          name: { type: "string", required: true, max: 120 },
          value: { type: "number", required: true },
          unit: { type: "string", max: 40 },
          referenceLow: { type: "number" },
          referenceHigh: { type: "number" },
          flag: { type: "string", enum: ["normal", "low", "high", "abnormal"] },
        },
      },
    },
    note: { type: "string", max: 500 },
  },
};
