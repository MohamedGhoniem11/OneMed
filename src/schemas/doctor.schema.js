// بروفايل الدكتور: doctors/{uid}  (نفس uid بتاع المستخدم)
export const doctorSchema = {
  collection: "doctors",
  fields: {
    specialty: { type: "string", required: true, max: 80 },
    licenseNumber: { type: "string", max: 40 },
    yearsOfExperience: { type: "number", min: 0, max: 70 },
    clinicName: { type: "string", max: 100 },
    clinicAddress: { type: "string", max: 200 },
    city: { type: "string", max: 60 },
    location: {
      type: "object",
      fields: {
        lat: { type: "number", required: true, min: -90, max: 90 },
        lng: { type: "number", required: true, min: -180, max: 180 },
      },
    },
    bio: { type: "string", max: 1000 },
    licenseNumber: { type: "string", required: true, min: 3, max: 40 },
    consultationFee: { type: "number", min: 0 },
    verified: { type: "boolean", readOnly: true },  // الأدمن بس هو اللي يوثّق الدكتور
    createdAt: { type: "timestamp", readOnly: true },
    updatedAt: { type: "timestamp", readOnly: true },
  },
};