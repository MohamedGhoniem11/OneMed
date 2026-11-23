import { EG_PHONE, normalizePhone } from "../utils/validators.js";

export const pharmacySchema = {
  collection: "pharmacies",
  fields: {
    name: { type: "string", required: true, max: 100 },
    address: { type: "string", required: true, max: 200 },
    city: { type: "string", max: 60 },
    location: {
      type: "object",
      required: true,
      fields: {
        lat: { type: "number", required: true, min: -90, max: 90 },
        lng: { type: "number", required: true, min: -180, max: 180 },
      },
    },
    whatsappNumber: {
      type: "string",
      required: true,
      transform: normalizePhone,
      pattern: EG_PHONE,
      message: "whatsappNumber is invalid",
    },
    openingHours: { type: "string", max: 100 },
    active: { type: "boolean" },
    createdAt: { type: "timestamp", readOnly: true },
    updatedAt: { type: "timestamp", readOnly: true },
  },
};
