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
if (nodeEnv === "production" && authProvider === "local" && !authJwtSecret) {
  throw new ConfigError("AUTH_JWT_SECRET is required when NODE_ENV=production and AUTH_PROVIDER=local.");
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

const jsonBodyLimit = readString("JSON_BODY_LIMIT", "1mb");
if (!/^\d+(kb|mb)$/i.test(jsonBodyLimit)) {
  throw new ConfigError(`JSON_BODY_LIMIT must look like "256kb" or "1mb" (got "${jsonBodyLimit}").`);
}

function readTrustProxy() {
  const value = readString("TRUST_PROXY");
  if (!value) return false;
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
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
  authAccessTtlSeconds: readInt("AUTH_ACCESS_TTL_SECONDS", 900, { min: 60, max: 86400 }),

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
  jsonBodyLimit,
  rateLimitWindowMs: readInt("RATE_LIMIT_WINDOW_MINUTES", 15, { min: 1, max: 1440 }) * 60 * 1000,
  rateLimitMax: readInt("RATE_LIMIT_MAX", 300),
  authRateLimitMax: readInt("AUTH_RATE_LIMIT_MAX", 20),
  ocrRateLimitMax: readInt("OCR_RATE_LIMIT_MAX", 30),
  aiRateLimitMax: readInt("AI_RATE_LIMIT_MAX", 30),
  rateLimitDisabled: readBool("RATE_LIMIT_DISABLED", false),
});

export { projectRoot };
