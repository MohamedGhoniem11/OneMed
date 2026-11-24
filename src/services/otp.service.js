import crypto from "node:crypto";
import { env } from "../config/env.js";
import { getStore } from "../store/index.js";
import { httpError } from "../utils/http-error.js";

/**
 * Registration OTP challenges (R2/R3, OQ14).
 *
 * Codes are six digits, hashed at rest, single-use, attempt-capped, and expire.
 * Delivery is a port: the dev adapter returns/logs the code only outside
 * production (or when explicitly enabled for a controlled demo). A real email
 * adapter can be added without changing callers.
 */

const CHALLENGES = "otpChallenges";
const hash = (id, salt, code) =>
  crypto.createHash("sha256").update(`${id}:${salt}:${code}`).digest("hex");

function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

async function expirePrevious(userId, purpose) {
  const { items } = await getStore().query(CHALLENGES, {
    where: [
      { field: "userId", op: "==", value: userId },
      { field: "purpose", op: "==", value: purpose },
      { field: "consumedAt", op: "==", value: null },
    ],
    limit: 10,
  });
  for (const item of items) {
    await getStore().update(CHALLENGES, item.id, {
      consumedAt: new Date(),
      consumedReason: "superseded",
      updatedAt: new Date(),
    });
  }
}

export async function createOtpChallenge({ userId, email, phone = "", purpose = "registration", name = "" }) {
  if (!env.authOtpDevDelivery) {
    throw httpError(
      503,
      "OTP delivery is not configured. Set AUTH_OTP_DEV_DELIVERY=true for the controlled demo or integrate an email provider.",
    );
  }

  await expirePrevious(userId, purpose);

  const challengeId = crypto.randomUUID();
  const code = generateCode();
  const salt = crypto.randomBytes(16).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + env.authOtpTtlMinutes * 60_000);

  await getStore().set(CHALLENGES, challengeId, {
    userId,
    email,
    phone,
    name,
    purpose,
    codeSalt: salt,
    codeHash: hash(challengeId, salt, code),
    attempts: 0,
    consumedAt: null,
    createdAt: now,
    updatedAt: now,
    expiresAt,
    delivery: "dev-response",
  });

  console.log(`[auth] Dev OTP for ${email || phone} (${purpose}): ${code}`);

  return {
    challengeId,
    purpose,
    expiresAt: expiresAt.toISOString(),
    // Clearly labeled demo delivery. Never returned in production unless the
    // operator explicitly opted in for a controlled demo.
    ...(env.authOtpDevDelivery ? { devCode: code } : {}),
    delivery: env.authOtpDevDelivery ? "dev-response" : "external-required",
  };
}

export async function verifyOtpChallenge({ challengeId, code, purpose = "registration" }) {
  const challenge = await getStore().get(CHALLENGES, challengeId);
  if (!challenge || challenge.purpose !== purpose) {
    throw httpError(400, "Invalid verification challenge");
  }
  if (challenge.consumedAt) throw httpError(400, "Verification code already used");
  if (new Date(challenge.expiresAt) <= new Date()) throw httpError(400, "Verification code expired");
  if (challenge.attempts >= env.authOtpMaxAttempts) {
    throw httpError(429, "Too many verification attempts; request a new code");
  }

  const expected = Buffer.from(challenge.codeHash, "hex");
  const actual = Buffer.from(hash(challengeId, challenge.codeSalt, String(code)), "hex");
  const valid = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);

  if (!valid) {
    await getStore().update(CHALLENGES, challengeId, {
      attempts: challenge.attempts + 1,
      updatedAt: new Date(),
    });
    throw httpError(401, "Invalid verification code");
  }

  await getStore().update(CHALLENGES, challengeId, {
    consumedAt: new Date(),
    consumedReason: "verified",
    updatedAt: new Date(),
  });
  return challenge;
}

export const otpInternals = { CHALLENGES };
