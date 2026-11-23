import { EG_PHONE, normalizePhone } from "../utils/validators.js";

const phone = {
  type: "string",
  transform: normalizePhone,
  pattern: EG_PHONE,
  message: "رقم الموبايل غير صالح (مثال: 01012345678)",
};

// ملف المستخدم الأساسي: users/{uid}
export const userSchema = {
  collection: "users",
  fields: {
    name: { type: "string", required: true, min: 2, max: 60 },
    phone,
    email: { type: "string", readOnly: true },     // من Firebase Auth
    role: { type: "string", readOnly: true },      // patient | doctor | admin
    createdAt: { type: "timestamp", readOnly: true },
    updatedAt: { type: "timestamp", readOnly: true },
  },
};

// بيانات التسجيل
export const registerSchema = {
  fields: {
    name: { type: "string", required: true, min: 2, max: 60 },
    email: {
      type: "string",
      required: true,
      max: 120,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: "email is invalid",
    },
    password: { type: "string", required: true, min: 6, max: 100 },
    role: { type: "string", required: true, enum: ["patient", "doctor"] },
    phone,
  },
};