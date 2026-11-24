import { generateSecret, generateURI, verify } from "otplib";
import { env } from "../config/env.js";
import { requiresMfa } from "../constants/auth.js";
import { getStore } from "../store/index.js";
import { httpError } from "../utils/http-error.js";

/**
 * Server-enforced TOTP MFA for clinical staff (R3, OQ14).
 *
 * Secrets live in a separate `userMfa/{uid}` document so they are not returned
 * by user/profile reads. TOTP verification happens server-side only; the client
 * never receives an MFA bypass. Firebase phone MFA can replace this later.
 */

const MFA_COLLECTION = "userMfa";
const ISSUER = "OneMed";

export async function getMfaRecord(userId) {
  return getStore().get(MFA_COLLECTION, userId);
}

export async function isMfaEnabled(userId) {
  const record = await getMfaRecord(userId);
  return Boolean(record?.enabled && record?.secret);
}

export async function beginMfaSetup(user) {
  if (!requiresMfa(user.role)) {
    throw httpError(400, "MFA is only required for clinical and administrative staff");
  }
  const existing = await getMfaRecord(user.id);
  if (existing?.enabled) throw httpError(409, "MFA is already enabled for this account");

  const secret = generateSecret();
  const now = new Date();
  await getStore().set(MFA_COLLECTION, user.id, {
    userId: user.id,
    secret,
    enabled: false,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });

  return {
    secret,
    otpauthUrl: generateURI({ secret, label: user.email, issuer: ISSUER }),
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  };
}

async function verifyCode(userId, code) {
  const record = await getMfaRecord(userId);
  if (!record?.secret) throw httpError(400, "MFA has not been set up for this account");
  const token = String(code ?? "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(token)) throw httpError(400, "MFA code must be six digits");

  try {
    const { valid } = await verify({ token, secret: record.secret, window: 1 });
    if (!valid) throw httpError(401, "Invalid MFA code");
  } catch (error) {
    if (error?.status === 401) throw error;
    throw httpError(400, "MFA code is invalid");
  }
  return record;
}

export async function enableMfa(user, code) {
  await verifyCode(user.id, code);
  const now = new Date();
  await getStore().update(MFA_COLLECTION, user.id, {
    enabled: true,
    enabledAt: now,
    updatedAt: now,
  });
  await getStore().update("users", user.id, { mfaEnabled: true, updatedAt: now });
  return { enabled: true, enabledAt: now.toISOString() };
}

export async function verifyLoginMfa(user, code) {
  const record = await getMfaRecord(user.id);
  if (!record?.enabled) throw httpError(400, "MFA is not enabled for this account");
  await verifyCode(user.id, code);
  return { verified: true };
}

export async function resetMfa(userId) {
  await getStore().delete(MFA_COLLECTION, userId);
  await getStore().update("users", userId, { mfaEnabled: false, updatedAt: new Date() });
}

export const mfaInternals = { MFA_COLLECTION, env };
