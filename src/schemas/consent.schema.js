export const CONSENT_SCOPES = Object.freeze([
  "demographics",
  "records",
  "prescriptions",
  "emergency",
]);

// consents/{autoId} — append-style grant records; revocation updates status.
export const consentSchema = {
  collection: "consents",
  fields: {
    patientId: { type: "string", required: true },
    granteeType: { type: "string", required: true, enum: ["doctor", "institution"] },
    granteeId: { type: "string", required: true },
    scope: {
      type: "array",
      required: true,
      min: 1,
      of: { type: "string", enum: [...CONSENT_SCOPES] },
    },
    purpose: { type: "string", max: 300 },
    status: { type: "string", readOnly: true }, // active | revoked | expired
    grantedAt: { type: "timestamp", readOnly: true },
    expiresAt: { type: "timestamp" },
    revokedAt: { type: "timestamp", readOnly: true },
    createdAt: { type: "timestamp", readOnly: true },
    updatedAt: { type: "timestamp", readOnly: true },
  },
};

export const consentGrantSchema = {
  fields: {
    granteeType: { type: "string", required: true, enum: ["doctor", "institution"] },
    granteeId: { type: "string", required: true },
    scope: {
      type: "array",
      required: true,
      min: 1,
      of: { type: "string", enum: [...CONSENT_SCOPES] },
    },
    purpose: { type: "string", max: 300 },
    expiresAt: {
      type: "string",
      pattern: /^\d{4}-\d{2}-\d{2}T/,
      message: "expiresAt must be an ISO-8601 timestamp",
    },
  },
};
