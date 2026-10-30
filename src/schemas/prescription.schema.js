// الروشتة: prescriptions/{autoId}  (الدكتور بيكتب العلاج بحرية)
export const prescriptionSchema = {
  collection: "prescriptions",
  fields: {
    patientId: { type: "string", required: true },
    doctorId: { type: "string", readOnly: true },   // من الـ token مش من الـ body
    diagnosis: { type: "string", max: 500 },
    items: {
      type: "array",
      required: true,
      min: 1,
      max: 50,
      of: {
        type: "object",
        fields: {
          name: { type: "string", required: true, max: 120 },
          dose: { type: "string", max: 80 },
          frequency: { type: "string", max: 80 },
          duration: { type: "string", max: 80 },
          notes: { type: "string", max: 300 },
        },
      },
    },
    notes: { type: "string", max: 1000 },
    createdAt: { type: "timestamp", readOnly: true },
    updatedAt: { type: "timestamp", readOnly: true },
  },
};