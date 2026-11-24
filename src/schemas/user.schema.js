import { EG_NATIONAL_ID, EG_PHONE, normalizePhone } from "../utils/validators.js";
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

export const emergencyContactFields = {
  name: { type: "string", required: true, min: 2, max: 80 },
  relationship: { type: "string", required: true, max: 40 },
  phone: { ...phone, required: true },
};

// users/{uid}
export const userSchema = {
  collection: "users",
  fields: {
    name: { type: "string", required: true, min: 2, max: 60 },
    phone,
    email: { type: "string", readOnly: true }, // from the identity provider
    role: { type: "string", readOnly: true }, // six canonical roles
    status: { type: "string", readOnly: true }, // pending_verification | active | disabled
    emailVerified: { type: "boolean", readOnly: true },
    mfaEnabled: { type: "boolean", readOnly: true },
    emergencyContact: {
      type: "object",
      fields: emergencyContactFields,
    },
    lastLoginAt: { type: "timestamp", readOnly: true },
    createdAt: { type: "timestamp", readOnly: true },
    updatedAt: { type: "timestamp", readOnly: true },
  },
};

// Public self-registration (staff roles are assigned by admins).
export const registerSchema = {
  fields: {
    name: { type: "string", required: true, min: 2, max: 60 },
    email,
    password: { type: "string", required: true, min: 8, max: 100 },
    role: { type: "string", required: true, enum: [...SELF_REGISTER_ROLES] },
    phone: { ...phone, required: true },
    emergencyContact: {
      type: "object",
      required: true,
      fields: emergencyContactFields,
    },
    patient: {
      type: "object",
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
        city: { type: "string", required: true, max: 60 },
        address: { type: "string", max: 200 },
        allergies: { type: "array", of: { type: "string", max: 60 }, max: 30 },
        chronicDiseases: { type: "array", of: { type: "string", max: 60 }, max: 30 },
        location: {
          type: "object",
          fields: {
            lat: { type: "number", required: true, min: -90, max: 90 },
            lng: { type: "number", required: true, min: -180, max: 180 },
          },
        },
      },
    },
    doctor: {
      type: "object",
      fields: {
        specialty: { type: "string", required: true, max: 80 },
        licenseNumber: { type: "string", required: true, min: 3, max: 40 },
        city: { type: "string", required: true, max: 60 },
        clinicName: { type: "string", max: 100 },
        clinicAddress: { type: "string", max: 200 },
        yearsOfExperience: { type: "number", min: 0, max: 70 },
        bio: { type: "string", max: 1000 },
        consultationFee: { type: "number", min: 0 },
      },
    },
  },
};

export const loginSchema = {
  fields: {
    email,
    password: { type: "string", required: true, min: 1, max: 100 },
  },
};

export const otpVerifySchema = {
  fields: {
    challengeId: { type: "string", required: true, min: 10, max: 64 },
    code: { type: "string", required: true, pattern: /^\d{6}$/, message: "code must be six digits" },
  },
};

export const resendOtpSchema = {
  fields: {
    challengeId: { type: "string", min: 10, max: 64 },
    email,
  },
};

export const mfaCodeSchema = {
  fields: {
    code: { type: "string", required: true, pattern: /^\d{6}$/, message: "MFA code must be six digits" },
  },
};

export const mfaVerifyLoginSchema = {
  fields: {
    mfaToken: { type: "string", required: true, min: 20 },
    code: { type: "string", required: true, pattern: /^\d{6}$/, message: "MFA code must be six digits" },
  },
};

export const mfaSetupSchema = {
  fields: {
    setupToken: { type: "string", required: true, min: 20 },
  },
};

export const mfaEnableSchema = {
  fields: {
    setupToken: { type: "string", required: true, min: 20 },
    code: { type: "string", required: true, pattern: /^\d{6}$/, message: "MFA code must be six digits" },
  },
};

export const staffCreateSchema = {
  fields: {
    name: { type: "string", required: true, min: 2, max: 60 },
    email,
    password: { type: "string", required: true, min: 8, max: 100 },
    role: {
      type: "string",
      required: true,
      enum: ["lab_staff", "pharmacy", "hospital_admin", "admin"],
    },
    phone: { ...phone, required: true },
    emergencyContact: {
      type: "object",
      required: true,
      fields: emergencyContactFields,
    },
  },
};
