import { EG_PHONE, normalizePhone } from "../utils/validators.js";
import { SELF_REGISTER_ROLES } from "../constants/roles.js";

const phone = {
  type: "string",
  transform: normalizePhone,
  pattern: EG_PHONE,
  message: "phone number is invalid (example: 01012345678)",
};

const email = {
  type: "string",
  required: true,
  max: 120,
  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  message: "email is invalid",
};

// users/{uid}
export const userSchema = {
  collection: "users",
  fields: {
    name: { type: "string", required: true, min: 2, max: 60 },
    phone,
    email: { type: "string", readOnly: true }, // from the identity provider
    role: { type: "string", readOnly: true }, // patient | doctor | lab_staff | pharmacy | hospital_admin | admin
    createdAt: { type: "timestamp", readOnly: true },
    updatedAt: { type: "timestamp", readOnly: true },
  },
};

// Public self-registration (staff roles are assigned by admins).
export const registerSchema = {
  fields: {
    name: { type: "string", required: true, min: 2, max: 60 },
    email,
    password: { type: "string", required: true, min: 6, max: 100 },
    role: { type: "string", required: true, enum: [...SELF_REGISTER_ROLES] },
    phone,
  },
};

export const loginSchema = {
  fields: {
    email,
    password: { type: "string", required: true, min: 1, max: 100 },
  },
};
