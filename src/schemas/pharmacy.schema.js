import { EG_PHONE, normalizePhone } from "../utils/validators.js";

export const pharmacySchema = {
  collection: "pharmacies",
  fields: {
    institutionId: { type: "string", max: 80 },
    licenseNumber: { type: "string", min: 3, max: 40 },
    name: { type: "string", required: true, max: 100 },
    address: { type: "string", required: true, max: 200 },
    city: { type: "string", max: 60 },
    phone: { type: "string", transform: normalizePhone, pattern: EG_PHONE, message: "phone is invalid" },
    location: {
      type: "object",
      required: true,
      fields: {
        lat: { type: "number", required: true, min: -90, max: 90 },
        lng: { type: "number", required: true, min: -180, max: 180 },
      },
    },
    whatsapp: {
      type: "string",
      required: true,
      transform: normalizePhone,
      pattern: EG_PHONE,
      message: "whatsapp number is invalid",
    },
    whatsappNumber: { type: "string", max: 20 },
    openingHours: { type: "string", max: 100 },
    hours: { type: "string", max: 100 },
    rating: { type: "number", min: 0, max: 5 },
    active: { type: "boolean" },
    status: { type: "string", enum: ["pending", "approved", "suspended"] },
    verified: { type: "boolean", readOnly: true },
    monthlyFee: { type: "number", min: 0 },
    createdAt: { type: "timestamp", readOnly: true },
    updatedAt: { type: "timestamp", readOnly: true },
  },
};
