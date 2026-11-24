import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { getJwtSecret } from "../auth/jwt-secret.js";
import { idleMinutesForRole } from "../constants/auth.js";
import { getStore } from "../store/index.js";
import { httpError } from "../utils/http-error.js";

/**
 * OneMed session layer (R3/R65).
 *
 * The identity provider (local or Firebase) authenticates the user once. OneMed
 * then issues its own 15-minute access JWT and a rotating opaque refresh token.
 * The refresh token is stored only as a SHA-256 hash and transported in an
 * httpOnly cookie. Every refresh invalidates the presented token; replay of an
 * already-rotated token revokes the whole session.
 */

const SESSIONS = "authSessions";
const ACCESS_TYPE = "access";
const MFA_TYPE = "mfa";
const SETUP_TYPE = "mfa_setup";
const GENERIC_INVALID = "Invalid or expired session";

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const newRefreshToken = () => `rt_${crypto.randomBytes(48).toString("base64url")}`;
const asDate = (value) => (value ? new Date(value) : null);
const isPast = (value, now = new Date()) => {
  const date = asDate(value);
  return Boolean(date && date.getTime() <= now.getTime());
};

function signAccess({ userId, role, sessionId, mfa, email }) {
  return jwt.sign(
    { typ: ACCESS_TYPE, role, sid: sessionId, mfa: Boolean(mfa), email: email ?? null },
    getJwtSecret(),
    {
      algorithm: "HS256",
      subject: userId,
      issuer: env.authJwtIssuer,
      audience: env.authJwtAudience,
      expiresIn: env.authAccessTtlSeconds,
    },
  );
}

function signScopedToken(type, user, stage) {
  return jwt.sign({ typ: type, stage, role: user.role }, getJwtSecret(), {
    algorithm: "HS256",
    subject: user.id,
    issuer: env.authJwtIssuer,
    audience: env.authJwtAudience,
    expiresIn: env.authMfaTokenTtlSeconds,
  });
}

function decode(token, expectedType) {
  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
      issuer: env.authJwtIssuer,
      audience: env.authJwtAudience,
    });
    if (typeof payload === "string" || !payload.sub || payload.typ !== expectedType) {
      throw new Error("Unexpected token type");
    }
    return payload;
  } catch {
    throw httpError(401, expectedType === ACCESS_TYPE ? GENERIC_INVALID : "Invalid or expired challenge token");
  }
}

export function verifyAccessToken(token) {
  const payload = decode(token, ACCESS_TYPE);
  if (!payload.sid || !payload.role) throw httpError(401, GENERIC_INVALID);
  return {
    uid: payload.sub,
    email: payload.email ?? null,
    role: payload.role,
    sessionId: payload.sid,
    mfa: payload.mfa === true,
  };
}

export function signMfaToken(user) {
  return signScopedToken(MFA_TYPE, user, "login");
}

export function signMfaSetupToken(user) {
  return signScopedToken(SETUP_TYPE, user, "setup");
}

export function verifyMfaToken(token) {
  const payload = decode(token, MFA_TYPE);
  return { uid: payload.sub, role: payload.role, stage: payload.stage };
}

export function verifyMfaSetupToken(token) {
  const payload = decode(token, SETUP_TYPE);
  return { uid: payload.sub, role: payload.role, stage: payload.stage };
}

export async function createSession(user, { ip = "", userAgent = "", mfa = false } = {}) {
  const now = new Date();
  const idleMinutes = idleMinutesForRole(user.role, env);
  const refreshToken = newRefreshToken();
  const session = await getStore().add(SESSIONS, {
    userId: user.id,
    role: user.role,
    email: user.email,
    mfa: Boolean(mfa),
    refreshTokenHash: hashToken(refreshToken),
    usedTokenHashes: [],
    createdAt: now,
    updatedAt: now,
    lastUsedAt: now,
    idleExpiresAt: new Date(now.getTime() + idleMinutes * 60_000),
    expiresAt: new Date(now.getTime() + env.authRefreshTtlDays * 86_400_000),
    revokedAt: null,
    ip,
    userAgent,
  });

  return {
    session,
    refreshToken,
    accessToken: signAccess({
      userId: user.id,
      role: user.role,
      sessionId: session.id,
      mfa,
      email: user.email,
    }),
    expiresIn: env.authAccessTtlSeconds,
    refreshExpiresAt: session.expiresAt,
    idleExpiresAt: session.idleExpiresAt,
  };
}

async function findSessionByToken(field, value, op) {
  const { items } = await getStore().query(SESSIONS, {
    where: [{ field, op, value }],
    limit: 1,
  });
  return items[0] ?? null;
}

export async function revokeSession(sessionId, reason = "logout") {
  const session = await getStore().get(SESSIONS, sessionId);
  if (!session || session.revokedAt) return false;
  await getStore().update(SESSIONS, sessionId, {
    revokedAt: new Date(),
    revokedReason: reason,
    updatedAt: new Date(),
  });
  return true;
}

export async function revokeUserSessions(userId, reason = "security") {
  const { items } = await getStore().query(SESSIONS, {
    where: [{ field: "userId", op: "==", value: userId }],
    limit: 200,
  });
  let count = 0;
  for (const session of items) {
    if (!session.revokedAt) {
      await revokeSession(session.id, reason);
      count += 1;
    }
  }
  return count;
}

export async function getSession(sessionId) {
  return getStore().get(SESSIONS, sessionId);
}

/**
 * Validate a live session and slide its idle window. Writes are throttled to one
 * per minute per session to keep Firestore costs bounded.
 */
export async function touchSession(sessionId, userId) {
  const session = await getSession(sessionId);
  if (!session || session.userId !== userId) throw httpError(401, GENERIC_INVALID);
  const now = new Date();
  if (session.revokedAt) throw httpError(401, GENERIC_INVALID);
  if (isPast(session.expiresAt, now) || isPast(session.idleExpiresAt, now)) {
    await revokeSession(sessionId, "expired").catch(() => {});
    throw httpError(401, GENERIC_INVALID);
  }

  const lastUsed = asDate(session.lastUsedAt);
  if (!lastUsed || now.getTime() - lastUsed.getTime() > 60_000) {
    const idleMinutes = idleMinutesForRole(session.role, env);
    const idleExpiresAt = new Date(now.getTime() + idleMinutes * 60_000);
    await getStore().update(SESSIONS, sessionId, {
      lastUsedAt: now,
      idleExpiresAt,
      updatedAt: now,
    });
    return { ...session, lastUsedAt: now.toISOString(), idleExpiresAt: idleExpiresAt.toISOString() };
  }
  return session;
}

export async function findSessionByRefreshToken(refreshToken) {
  if (!refreshToken) return null;
  return findSessionByToken("refreshTokenHash", hashToken(refreshToken), "==");
}

export async function refreshSession(refreshToken, { ip = "", userAgent = "" } = {}) {  if (!refreshToken) throw httpError(401, "Missing refresh token");
  const tokenHash = hashToken(refreshToken);
  const session = await findSessionByToken("refreshTokenHash", tokenHash, "==");

  if (!session) {
    // A known-but-rotated token means the cookie was replayed: revoke everything
    // tied to that token rather than silently issuing a new session.
    const replayed = await findSessionByToken("usedTokenHashes", tokenHash, "array-contains");
    if (replayed) {
      await revokeSession(replayed.id, "refresh_token_reuse").catch(() => {});
    }
    throw httpError(401, GENERIC_INVALID);
  }

  const now = new Date();
  if (session.revokedAt || isPast(session.expiresAt, now) || isPast(session.idleExpiresAt, now)) {
    if (!session.revokedAt) await revokeSession(session.id, "expired").catch(() => {});
    throw httpError(401, GENERIC_INVALID);
  }

  const nextToken = newRefreshToken();
  const used = Array.isArray(session.usedTokenHashes) ? session.usedTokenHashes : [];
  const idleMinutes = idleMinutesForRole(session.role, env);
  const updated = await getStore().update(SESSIONS, session.id, {
    refreshTokenHash: hashToken(nextToken),
    usedTokenHashes: [...used, tokenHash].slice(-10),
    lastUsedAt: now,
    idleExpiresAt: new Date(now.getTime() + idleMinutes * 60_000),
    updatedAt: now,
    ip: ip || session.ip || "",
    userAgent: userAgent || session.userAgent || "",
  });

  return {
    session: updated,
    refreshToken: nextToken,
    accessToken: signAccess({
      userId: updated.userId,
      role: updated.role,
      sessionId: updated.id,
      mfa: updated.mfa,
      email: updated.email,
    }),
    expiresIn: env.authAccessTtlSeconds,
    refreshExpiresAt: updated.expiresAt,
    idleExpiresAt: updated.idleExpiresAt,
  };
}

/** Revoke all sessions for a user, then create a fresh one (used after MFA). */
export async function rotateSessionForUser(user, options) {
  await revokeUserSessions(user.id, "new_login");
  return createSession(user, options);
}

export const sessionInternals = { hashToken, SESSIONS };
