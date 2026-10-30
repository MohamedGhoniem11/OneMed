// بروفايل المريض: patients/{uid}  (نفس uid بتاع المستخدم)
export const patientSchema = {
  collection: "patients",
  fields: {
    dateOfBirth: {
      type: "string",
      pattern: /^\d{4}-\d{2}-\d{2}$/,
      message: "dateOfBirth must be YYYY-MM-DD",
    },
    gender: { type: "string", enum: ["male", "female"] },
    city: { type: "string", max: 60 },
    address: { type: "string", max: 200 },
    location: {
      type: "object", // علشان أقرب صيدلية
      fields: {
        lat: { type: "number", required: true, min: -90, max: 90 },
        lng: { type: "number", required: true, min: -180, max: 180 },
      },
    },
    allergies: { type: "array", of: { type: "string", max: 60 }, max: 30 },
    chronicDiseases: { type: "array", of: { type: "string", max: 60 }, max: 30 },
    createdAt: { type: "timestamp", readOnly: true },
    updatedAt: { type: "timestamp", readOnly: true },
  },
};