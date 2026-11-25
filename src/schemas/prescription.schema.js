// prescriptions/{autoId} - a doctor-confirmed prescription with a 24h fulfillment link.
export const PRESCRIPTION_STATUSES = Object.freeze(["pending", "confirmed", "cancelled", "expired"]);
export const EXTRACTION_STATUSES = Object.freeze(["pending", "extracted", "confirmed"]);
export const ORDER_STATUSES = Object.freeze([
  "received", "verifying", "preparing", "ready", "handed_over", "completed", "cancelled",
]);

export const medicineSchema = {
  fields: {
    name: { type: "string", required: true, max: 120 },
    dose: { type: "string", max: 80 },
    dosage: { type: "string", max: 80 },
    frequency: { type: "string", max: 80 },
    duration: { type: "string", max: 80 },
    instructions: { type: "string", max: 300 },
    notes: { type: "string", max: 300 },
    confidence: { type: "number", min: 0, max: 100 },
  },
};

export const prescriptionSchema = {
  collection: "prescriptions",
  fields: {
    patientId: { type: "string", required: true },
    doctorId: { type: "string", readOnly: true },
    patientName: { type: "string", max: 100 },
    doctorName: { type: "string", max: 100 },
    diagnosis: { type: "string", max: 500 },
    items: { type: "array", required: true, min: 1, max: 50, of: medicineSchema },
    notes: { type: "string", max: 1000 },
    status: { type: "string", enum: [...PRESCRIPTION_STATUSES] },
    extractionStatus: { type: "string", enum: [...EXTRACTION_STATUSES] },
    extractionConfidence: { type: "number", min: 0, max: 100 },
    linkToken: { type: "string", max: 600 },
    linkExpiresAt: { type: "timestamp" },
    fulfillmentLink: { type: "string", max: 800 },
    pharmacyId: { type: "string", max: 80 },
    pharmacyName: { type: "string", max: 100 },
    orderStatus: { type: "string", enum: [...ORDER_STATUSES] },
    whatsappUrl: { type: "string", max: 2000 },
    createdAt: { type: "timestamp", readOnly: true },
    updatedAt: { type: "timestamp", readOnly: true },
  },
};

export const confirmSchema = {
  fields: {
    confirmed: { type: "boolean", required: true },
    items: { type: "array", required: true, min: 1, max: 50, of: medicineSchema },
  },
};
