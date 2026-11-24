// authSessions/{autoId} — rotating refresh sessions (R3/R65).
export const sessionSchema = {
  collection: "authSessions",
  fields: {
    userId: { type: "string", required: true },
    role: { type: "string", required: true },
    email: { type: "string" },
    mfa: { type: "boolean" },
    refreshTokenHash: { type: "string", required: true },
    usedTokenHashes: { type: "array", of: { type: "string" } },
    createdAt: { type: "timestamp" },
    updatedAt: { type: "timestamp" },
    lastUsedAt: { type: "timestamp" },
    idleExpiresAt: { type: "timestamp" },
    expiresAt: { type: "timestamp" },
    revokedAt: { type: "timestamp" },
    revokedReason: { type: "string" },
    ip: { type: "string" },
    userAgent: { type: "string" },
  },
};

// otpChallenges/{autoId}
export const otpChallengeSchema = {
  collection: "otpChallenges",
  fields: {
    userId: { type: "string", required: true },
    email: { type: "string" },
    phone: { type: "string" },
    purpose: { type: "string", required: true },
    codeSalt: { type: "string" },
    codeHash: { type: "string" },
    attempts: { type: "number" },
    consumedAt: { type: "timestamp" },
    expiresAt: { type: "timestamp" },
    delivery: { type: "string" },
  },
};

// userMfa/{uid}
export const mfaRecordSchema = {
  collection: "userMfa",
  fields: {
    userId: { type: "string", required: true },
    secret: { type: "string", required: true },
    enabled: { type: "boolean" },
    createdAt: { type: "timestamp" },
    updatedAt: { type: "timestamp" },
    enabledAt: { type: "timestamp" },
  },
};
