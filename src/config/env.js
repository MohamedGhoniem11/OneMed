import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Central, validated environment configuration.
 *
 * The API must boot with zero cloud credentials. When no Firebase credentials
 * are present (and no explicit provider is requested) it runs in `local` mode:
 * a real file-backed store plus backend-issued JWTs. Firebase/Firestore remain
 * the production implementations and are selected automatically once credentials
 * are configured.
 */

export class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConfigError";
    this.code = "CONFIG_ERROR";
  }
}

const projectRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const raw = process.env;

const NODE_ENVS = ["development", "test", "production"];
const nodeEnv = NODE_ENVS.includes(raw.NODE_ENV) ? raw.NODE_ENV : "development";

const resolveFromRoot = (p) => (path.isAbsolute(p) ? p : path.resolve(projectRoot, p));

function readString(name, fallback = "") {
  const value = raw[name];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
}

function readInt(name, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const value = readString(name);
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new ConfigError(`${name} must be an integer between ${min} and ${max} (got "${value}").`);
  }
  return parsed;
}

function readBool(name, fallback = false) {
  const value = readString(name).toLowerCase();
  if (!value) return fallback;
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  throw new ConfigError(`${name} must be true or false (got "${value}").`);
}

function readEnum(name, allowed, fallback) {
  const value = readString(name, fallback);
  if (!allowed.includes(value)) {
    throw new ConfigError(`${name} must be one of: ${allowed.join(", ")} (got "${value}").`);
  }
  return value;
}

const localDataDir = resolveFromRoot(readString("LOCAL_DATA_DIR", "data"));
const credentialPath = raw.GOOGLE_APPLICATION_CREDENTIALS
  ? resolveFromRoot(raw.GOOGLE_APPLICATION_CREDENTIALS.trim())
  : path.join(projectRoot, "serviceAccountKey.json");
const hasInlineServiceAccount = Boolean(readString("FIREBASE_SERVICE_ACCOUNT_JSON"));
const hasServiceAccountFile = fs.existsSync(credentialPath);
const hasServiceAccount = hasInlineServiceAccount || hasServiceAccountFile;
const hasFirestoreEmulator = Boolean(raw.FIRESTORE_EMULATOR_HOST);
const hasAuthEmulator = Boolean(raw.FIREBASE_AUTH_EMULATOR_HOST);
const hasEmulator = hasFirestoreEmulator || hasAuthEmulator;
const firebaseConfigured = hasServiceAccount || hasEmulator;
const firestoreAvailable = hasServiceAccount || hasFirestoreEmulator;
const authAvailable = hasServiceAccount || hasAuthEmulator;

if (hasInlineServiceAccount) {
  try {
    JSON.parse(raw.FIREBASE_SERVICE_ACCOUNT_JSON);
  } catch {
    throw new ConfigError("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.");
  }
}

const persistence = readEnum("PERSISTENCE", ["local", "firestore"], firestoreAvailable ? "firestore" : "local");
const authProvider = readEnum("AUTH_PROVIDER", ["local", "firebase"], authAvailable ? "firebase" : "local");

if (persistence === "firestore" && !firestoreAvailable) {
  throw new ConfigError(
    "PERSISTENCE=firestore requires Firebase credentials: set GOOGLE_APPLICATION_CREDENTIALS to an existing service account JSON, " +
      "or FIREBASE_SERVICE_ACCOUNT_JSON, or FIRESTORE_EMULATOR_HOST. Omit PERSISTENCE to run the local demo store.",
  );
}
if (authProvider === "firebase" && !authAvailable) {
  throw new ConfigError(
    "AUTH_PROVIDER=firebase requires Firebase credentials: set GOOGLE_APPLICATION_CREDENTIALS to an existing service account JSON, " +
      "or FIREBASE_SERVICE_ACCOUNT_JSON, or FIREBASE_AUTH_EMULATOR_HOST. Omit AUTH_PROVIDER to run local auth.",
  );
}

const authJwtSecret = readString("AUTH_JWT_SECRET");
if (authJwtSecret && authJwtSecret.length < 32) {
  throw new ConfigError("AUTH_JWT_SECRET must be at least 32 characters. Generate one with crypto.randomBytes(48).toString('hex').");
}
if (nodeEnv === "production" && !authJwtSecret) {
  throw new ConfigError(
    "AUTH_JWT_SECRET is required in production. It signs OneMed 15-minute access tokens after the identity provider authenticates the user.",
  );
}

const corsOrigins = (readString("CORS_ORIGINS", "http://localhost:5173,http://localhost:4173") || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
if (corsOrigins.length === 0) {
  throw new ConfigError("CORS_ORIGINS must contain at least one origin (or *).");
}
if (nodeEnv === "production" && corsOrigins.includes("*") && firebaseConfigured) {
  console.warn("[config] CORS_ORIGINS=* is not recommended in production; set an explicit allowlist.");
}

// Public links embeds in QR codes/NFC handoffs. Must be the origin the patient browser can reach.
const geminiApiKey = readString("GEMINI_API_KEY");
const geminiModel = readString("GEMINI_MODEL", "gemini-2.5-flash");
const geminiEmbeddingModel = readString("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001");

const publicBaseUrl = readString("PUBLIC_BASE_URL", "http://localhost:5173").replace(/\/+$/, "");
if (!/^https?:\/\//.test(publicBaseUrl)) {
  throw new ConfigError("PUBLIC_BASE_URL must start with http:// or https://");
}
const connectionTtlSeconds = readInt("CONNECTION_TTL_SECONDS", 900, { min: 60, max: 3600 });
const emergencyRateLimitMax = readInt("EMERGENCY_RATE_LIMIT_MAX", 60, { min: 5, max: 600 });
const fulfillmentTtlSeconds = readInt("FULFILLMENT_TTL_SECONDS", 86400, { min: 3600, max: 604800 });
const nfcTtlSeconds = readInt("NFC_TTL_SECONDS", 31536000, { min: 3600, max: 315360000 });
const emergencyTtlSeconds = readInt("EMERGENCY_TTL_SECONDS", 31536000, { min: 3600, max: 315360000 });

const jsonBodyLimit = readString("JSON_BODY_LIMIT", "1mb");
if (!/^\d+(kb|mb)$/i.test(jsonBodyLimit)) {
  throw new ConfigError(`JSON_BODY_LIMIT must look like "256kb" or "1mb" (got "${jsonBodyLimit}").`);
}

// Medical uploads: AES-256-GCM key, 50MB cap, and 80% review threshold (OQ4).
const uploadEncryptionKey = readString("UPLOAD_ENCRYPTION_KEY");
if (uploadEncryptionKey && !/^[0-9a-fA-F]{64}$/.test(uploadEncryptionKey)) {
  throw new ConfigError("UPLOAD_ENCRYPTION_KEY must be 64 hex characters (32 bytes) for AES-256-GCM.");
}
if (nodeEnv === "production" && !uploadEncryptionKey) {
  throw new ConfigError("UPLOAD_ENCRYPTION_KEY is required in production (64 hex characters).");
}
const uploadMaxMb = readInt("UPLOAD_MAX_MB", 50, { min: 1, max: 100 });
const ocrConfidenceThreshold = readInt("OCR_CONFIDENCE_THRESHOLD", 80, { min: 50, max: 99 });

function readTrustProxy() {
  const value = readString("TRUST_PROXY");
  if (!value) return false;
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}

const cookieSameSite = readEnum("AUTH_COOKIE_SAMESITE", ["lax", "strict", "none"], "lax");
const cookieSecure = readBool("AUTH_COOKIE_SECURE", nodeEnv === "production");
if (cookieSameSite === "none" && !cookieSecure) {
  throw new ConfigError("AUTH_COOKIE_SAMESITE=none requires AUTH_COOKIE_SECURE=true.");
}
const otpDevDelivery = readBool("AUTH_OTP_DEV_DELIVERY", nodeEnv !== "production");
if (nodeEnv === "production" && otpDevDelivery) {
  console.warn(
    "[config] AUTH_OTP_DEV_DELIVERY=true in production. OTP codes will be returned by the API and logged; use only for a controlled demo.",
  );
}

export const env = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === "production",
  isTest: nodeEnv === "test",
  projectRoot,
  host: readString("HOST", "0.0.0.0"),
  port: readInt("PORT", 3000, { min: 1, max: 65535 }),
  trustProxy: readTrustProxy(),

  persistence,
  authProvider,
  localDataDir,

  authJwtSecret,
  authJwtIssuer: readString("AUTH_JWT_ISSUER", "onemed-api"),
  authJwtAudience: readString("AUTH_JWT_AUDIENCE", "onemed-clients"),
  authAccessTtlSeconds: readInt("AUTH_ACCESS_TTL_SECONDS", 900, { min: 60, max: 3600 }),
  authRefreshTtlDays: readInt("AUTH_REFRESH_TTL_DAYS", 7, { min: 1, max: 90 }),
  authIdleMinutesPatient: readInt("AUTH_IDLE_MINUTES_PATIENT", 30, { min: 5, max: 240 }),
  authIdleMinutesStaff: readInt("AUTH_IDLE_MINUTES_STAFF", 15, { min: 5, max: 120 }),
  authMfaTokenTtlSeconds: readInt("AUTH_MFA_TOKEN_TTL_SECONDS", 300, { min: 60, max: 900 }),
  authOtpTtlMinutes: readInt("AUTH_OTP_TTL_MINUTES", 10, { min: 1, max: 60 }),
  authOtpMaxAttempts: readInt("AUTH_OTP_MAX_ATTEMPTS", 5, { min: 1, max: 20 }),
  authOtpDevDelivery: otpDevDelivery,
  authCookieName: readString("AUTH_COOKIE_NAME", "onemed_rt"),
  authCookieSecure: cookieSecure,
  authCookieSameSite: cookieSameSite,
  authCookieDomain: readString("AUTH_COOKIE_DOMAIN"),

  firebaseConfigured,
  credentialPath,
  hasInlineServiceAccount,
  hasServiceAccountFile,
  hasEmulator,
  firebaseProjectId: readString("FIREBASE_PROJECT_ID", hasEmulator ? "demo-onemed" : ""),
  firebaseApiKey: readString("FIREBASE_API_KEY"),
  firestoreEmulatorHost: readString("FIRESTORE_EMULATOR_HOST"),
  firebaseAuthEmulatorHost: readString("FIREBASE_AUTH_EMULATOR_HOST"),

  corsOrigins,
  publicBaseUrl,
  connectionTtlSeconds,
  emergencyRateLimitMax,
  fulfillmentTtlSeconds,
  nfcTtlSeconds,
  emergencyTtlSeconds,
  geminiApiKey,
  geminiModel,
  geminiEmbeddingModel,
  jsonBodyLimit,
  uploadEncryptionKey,
  uploadMaxMb,
  uploadMaxBytes: uploadMaxMb * 1024 * 1024,
  uploadDir: resolveFromRoot(readString("UPLOAD_DIR", "data/uploads")),
  ocrConfidenceThreshold,
  rateLimitWindowMs: readInt("RATE_LIMIT_WINDOW_MINUTES", 15, { min: 1, max: 1440 }) * 60 * 1000,
  rateLimitMax: readInt("RATE_LIMIT_MAX", 300),
  authRateLimitMax: readInt("AUTH_RATE_LIMIT_MAX", 20),
  ocrRateLimitMax: readInt("OCR_RATE_LIMIT_MAX", 30),
  aiRateLimitMax: readInt("AI_RATE_LIMIT_MAX", 30),
  rateLimitDisabled: readBool("RATE_LIMIT_DISABLED", false),
});

export { projectRoot };
