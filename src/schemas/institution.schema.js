import { EG_PHONE, normalizePhone } from "../utils/validators.js";

// institutions/{autoId} — hospitals, labs, clinics
export const institutionSchema = {
  collection: "institutions",
  fields: {
    name: { type: "string", required: true, max: 120 },
    type: { type: "string", required: true, enum: ["hospital", "laboratory", "clinic"] },
    licenseNumber: { type: "string", required: true, min: 3, max: 40 },
    city: { type: "string", required: true, max: 60 },
    address: { type: "string", max: 200 },
    contactEmail: {
      type: "string",
      max: 120,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: "contactEmail is invalid",
    },
    contactPhone: {
      type: "string",
      transform: normalizePhone,
      pattern: EG_PHONE,
      message: "contactPhone is invalid",
    },
    verified: { type: "boolean", readOnly: true },
    active: { type: "boolean" },
    createdAt: { type: "timestamp", readOnly: true },
    updatedAt: { type: "timestamp", readOnly: true },
  },
};
