import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ConfigError, env } from "../config/env.js";

let cached = null;

/**
 * Secret used to sign local-mode access tokens.
 *
 * Production must supply AUTH_JWT_SECRET. Development/test get a generated
 * secret persisted in the gitignored data directory so restarts keep sessions
 * valid without ever committing a secret.
 */
export function getJwtSecret() {
  if (cached) return cached;

  if (env.authJwtSecret) {
    cached = env.authJwtSecret;
    return cached;
  }

  if (env.isProduction) {
    throw new ConfigError("AUTH_JWT_SECRET is required in production.");
  }

  const secretFile = path.join(env.localDataDir, ".jwt-secret");
  if (fs.existsSync(secretFile)) {
    const value = fs.readFileSync(secretFile, "utf8").trim();
    if (value.length < 32) {
      throw new ConfigError(`Development JWT secret at ${secretFile} is too short; delete it to regenerate.`);
    }
    cached = value;
    return cached;
  }

  fs.mkdirSync(env.localDataDir, { recursive: true });
  cached = crypto.randomBytes(48).toString("hex");
  fs.writeFileSync(secretFile, `${cached}\n`, { encoding: "utf8", mode: 0o600 });
  console.warn(
    `[auth] Generated a development JWT secret at ${secretFile} (gitignored). ` +
      "Set AUTH_JWT_SECRET for shared or production environments.",
  );
  return cached;
}
