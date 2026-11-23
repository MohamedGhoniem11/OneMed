import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Must run before any test imports the app/config so env.js sees these values.
process.env.NODE_ENV = "test";
process.env.PERSISTENCE = "local";
process.env.AUTH_PROVIDER = "local";
process.env.AUTH_JWT_SECRET = "test-only-jwt-secret-0123456789abcdef0123456789abcdef";
process.env.AUTH_JWT_ISSUER = "onemed-api-test";
process.env.AUTH_JWT_AUDIENCE = "onemed-clients-test";
process.env.AUTH_ACCESS_TTL_SECONDS = "900";
process.env.RATE_LIMIT_DISABLED = "true";
process.env.CORS_ORIGINS = "http://localhost:5173,http://localhost:4173";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const worker = process.env.VITEST_WORKER_ID || String(process.pid);
const dataDir = path.join(root, "tests", ".tmp-data", worker);
fs.rmSync(dataDir, { recursive: true, force: true });
process.env.LOCAL_DATA_DIR = dataDir;
