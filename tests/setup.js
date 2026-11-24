import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const worker = process.env.VITEST_WORKER_ID || String(process.pid);
const dataDir = path.join(root, "tests", ".tmp-data", worker);
fs.rmSync(dataDir, { recursive: true, force: true });

process.env.NODE_ENV = "test";
process.env.AUTH_PROVIDER = "local";
process.env.PERSISTENCE = "local";
process.env.LOCAL_DATA_DIR = dataDir;
process.env.UPLOAD_DIR = path.join(dataDir, "uploads");
process.env.UPLOAD_ENCRYPTION_KEY = "a".repeat(64);
process.env.AUTH_JWT_SECRET = "test-only-secret-that-is-at-least-32-characters-long";
process.env.AUTH_OTP_DEV_DELIVERY = "true";
process.env.RATE_LIMIT_DISABLED = "true";
process.env.CORS_ORIGINS = "http://localhost:5173,http://localhost:4173";