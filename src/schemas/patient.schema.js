import { EG_NATIONAL_ID } from "../utils/validators.js";
import { emergencyContactFields } from "./user.schema.js";

// patients/{uid} — same uid as users/{uid}
export const patientSchema = {
  collection: "patients",
  fields: {
    nationalId: {
      type: "string",
      required: true,
      pattern: EG_NATIONAL_ID,
      message: "nationalId must be a 14-digit Egyptian national ID",
    },
    dateOfBirth: {
      type: "string",
      required: true,
      pattern: /^\d{4}-\d{2}-\d{2}$/,
      message: "dateOfBirth must be YYYY-MM-DD",
    },
    gender: { type: "string", required: true, enum: ["male", "female"] },
    bloodGroup: {
      type: "string",
      required: true,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    city: { type: "string", max: 60 },
    address: { type: "string", max: 200 },
    emergencyContacts: {
      type: "array",
      required: true,
      min: 1,
      max: 5,
      of: { type: "object", fields: emergencyContactFields },
    },
    location: {
      type: "object",
      fields: {
        lat: { type: "number", required: true, min: -90, max: 90 },
        lng: { type: "number", required: true, min: -180, max: 180 },
      },
    },
    allergies: { type: "array", of: { type: "string", max: 60 }, max: 30 },
    chronicDiseases: { type: "array", of: { type: "string", max: 60 }, max: 30 },
    activeMedications: { type: "array", of: { type: "string", max: 120 }, max: 50 },
    privacy: {
      type: "object",
      fields: {
        showBloodGroup: { type: "boolean" },
        showAllergies: { type: "boolean" },
        showMedications: { type: "boolean" },
        showEmergencyContacts: { type: "boolean" },
      },
    },
    createdAt: { type: "timestamp", readOnly: true },
    updatedAt: { type: "timestamp", readOnly: true },
  },
};

export const patientUpdateSchema = {
  fields: {
    dateOfBirth: patientSchema.fields.dateOfBirth,
    bloodGroup: patientSchema.fields.bloodGroup,
    city: patientSchema.fields.city,
    address: patientSchema.fields.address,
    emergencyContacts: patientSchema.fields.emergencyContacts,
    location: patientSchema.fields.location,
    allergies: patientSchema.fields.allergies,
    chronicDiseases: patientSchema.fields.chronicDiseases,
    activeMedications: patientSchema.fields.activeMedications,
    privacy: patientSchema.fields.privacy,
  },
};
