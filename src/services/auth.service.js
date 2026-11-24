import { getIdp } from "../auth/index.js";
import { requiresMfa } from "../constants/auth.js";
import { env } from "../config/env.js";
import { getStore } from "../store/index.js";
import { appendAudit } from "./audit.service.js";
import * as mfa from "./mfa.service.js";
import * as otp from "./otp.service.js";
import { createSession, findSessionByRefreshToken, refreshSession, revokeSession, signMfaSetupToken, signMfaToken, verifyMfaSetupToken, verifyMfaToken } from "./session.service.js";
import { httpError } from "../utils/http-error.js";

const USERS = "users";
const PATIENTS = "patients";
const DOCTORS = "doctors";

function httpStatusForAuthError(error) {
  switch (error?.code) {
    case "auth/email-already-exists":
      return 409;
    case "auth/invalid-email":
    case "auth/invalid-password":
    case "auth/weak-password":
    case "auth/invalid-display-name":
      return 400;
    default:
      return null;
  }
}

export function safeUser(user) {
  return {
    id: user.id,
    uid: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? "",
    role: user.role,
    status: user.status ?? "active",
    emailVerified: user.emailVerified === true || user.status === "active",
    mfaEnabled: user.mfaEnabled === true,
  };
}

function sessionPayload(user, session) {
  return {
    user: safeUser(user),
    accessToken: session.accessToken,
    idToken: session.accessToken, // backwards-compatible alias for older clients
    tokenType: "Bearer",
    expiresIn: session.expiresIn,
    refreshExpiresAt: session.refreshExpiresAt,
    idleExpiresAt: session.idleExpiresAt,
  };
}

async function audit(entry) {
  return appendAudit(entry).catch((error) => {
    console.error("[audit] append failed", error);
    throw error;
  });
}

async function findByEmail(email) {
  const { items } = await getStore().query(USERS, {
    where: [{ field: "email", op: "==", value: email.trim().toLowerCase() }],
    limit: 1,
  });
  return items[0] ?? null;
}

async function ensureUnique(field, value, collection, label) {
  const { items } = await getStore().query(collection, {
    where: [{ field, op: "==", value }],
    limit: 1,
  });
  if (items.length) throw httpError(409, `${label} already exists`);
}

async function createRoleProfile(uid, data) {
  const now = new Date();
  if (data.role === "patient") {
    if (!data.patient) throw httpError(400, "patient profile details are required for the patient role");
    await ensureUnique("nationalId", data.patient.nationalId, PATIENTS, "National ID");
    await getStore().set(PATIENTS, uid, {
      ...data.patient,
      emergencyContacts: [data.emergencyContact],
      createdAt: now,
      updatedAt: now,
    });
    return;
  }

  if (data.role === "doctor") {
    if (!data.doctor) throw httpError(400, "doctor profile details are required for the doctor role");
    await ensureUnique("licenseNumber", data.doctor.licenseNumber, DOCTORS, "Medical license number");
    await getStore().set(DOCTORS, uid, {
      ...data.doctor,
      verified: false,
      createdAt: now,
      updatedAt: now,
    });
  }
}

/**
 * Creates a pending account and issues an OTP challenge. No access token is
 * returned until the OTP is verified and (for staff) MFA is enrolled.
 */
export async function register(data) {
  const idp = getIdp();
  const store = getStore();
  const normalizedEmail = data.email.trim().toLowerCase();

  let uid;
  try {
    ({ uid } = await idp.createUser({
      email: normalizedEmail,
      password: data.password,
      displayName: data.name,
    }));
  } catch (error) {
    const status = httpStatusForAuthError(error);
    if (status === 409) throw httpError(409, "Email already exists");
    if (status) throw httpError(status, error.message);
    throw error;
  }

  try {
    const now = new Date();
    await idp.setCustomUserClaims(uid, { role: data.role });
    await store.set(USERS, uid, {
      name: data.name,
      email: normalizedEmail,
      phone: data.phone,
      role: data.role,
      status: "pending_verification",
      emailVerified: false,
      mfaEnabled: false,
      emergencyContact: data.emergencyContact,
      createdAt: now,
      updatedAt: now,
    });
    await createRoleProfile(uid, data);

    const challenge = await otp.createOtpChallenge({
      userId: uid,
      email: normalizedEmail,
      phone: data.phone,
      purpose: "registration",
      name: data.name,
    });

    await audit({
      actorId: uid,
      actorRole: data.role,
      action: "account_registered",
      resourceType: "user",
      resourceId: uid,
      metadata: { role: data.role, status: "pending_verification" },
    });

    return {
      user: safeUser({ id: uid, ...data, status: "pending_verification", mfaEnabled: false }),
      requiresOtp: true,
      ...challenge,
    };
  } catch (error) {
    await getStore().delete(PATIENTS, uid).catch(() => {});
    await getStore().delete(DOCTORS, uid).catch(() => {});
    await getStore().delete(USERS, uid).catch(() => {});
    await idp.deleteUser(uid).catch(() => {});
    throw error;
  }
}

export async function verifyRegistrationOtp({ challengeId, code }) {
  const challenge = await otp.verifyOtpChallenge({ challengeId, code, purpose: "registration" });
  const user = await getStore().get(USERS, challenge.userId);
  if (!user) throw httpError(404, "Account not found");

  const now = new Date();
  const updated =
    user.status === "active"
      ? user
      : await getStore().update(USERS, challenge.userId, {
          status: "active",
          emailVerified: true,
          emailVerifiedAt: now,
          updatedAt: now,
        });

  await audit({
    actorId: user.id,
    actorRole: user.role,
    action: "email_verified",
    resourceType: "user",
    resourceId: user.id,
  });

  return {
    verified: true,
    user: safeUser(updated),
    next: requiresMfa(user.role) ? "login_mfa" : "login",
    mfaRequired: requiresMfa(user.role),
  };
}

export async function resendRegistrationOtp({ challengeId, email }) {
  let userId;
  const targetEmail = email?.trim().toLowerCase();

  if (challengeId) {
    const challenge = await getStore().get(otp.otpInternals.CHALLENGES, challengeId);
    if (!challenge) throw httpError(400, "Invalid verification challenge");
    userId = challenge.userId;
  } else if (targetEmail) {
    const user = await findByEmail(targetEmail);
    if (!user) throw httpError(400, "No pending account matches that email");
    userId = user.id;
  } else {
    throw httpError(400, "challengeId or email is required");
  }

  const user = await getStore().get(USERS, userId);
  if (!user) throw httpError(404, "Account not found");
  if (user.status === "active") throw httpError(400, "Account is already verified");
  if (user.status === "disabled") throw httpError(403, "Account is disabled");

  const challenge = await otp.createOtpChallenge({
    userId,
    email: user.email,
    phone: user.phone,
    purpose: "registration",
    name: user.name,
  });
  await audit({
    actorId: user.id,
    actorRole: user.role,
    action: "otp_resent",
    resourceType: "user",
    resourceId: user.id,
  });
  return { user: safeUser(user), requiresOtp: true, ...challenge };
}

async function requireActiveUser(uid) {
  const user = await getStore().get(USERS, uid);
  if (!user) throw httpError(403, "No OneMed profile is linked to this account; contact an administrator.");
  if (user.status === "disabled") throw httpError(403, "Account is disabled");
  if (user.status === "pending_verification") {
    throw httpError(403, "Account is not verified. Complete the OTP verification first.");
  }
  return user;
}

export async function login({ email, password }, meta = {}) {
  const normalizedEmail = email.trim().toLowerCase();
  let identity;
  try {
    identity = await getIdp().signInWithPassword(normalizedEmail, password);
  } catch (error) {
    await audit({
      actorId: null,
      actorRole: null,
      action: "login_failed",
      resourceType: "auth",
      metadata: { email: normalizedEmail, ip: meta.ip ?? "" },
    }).catch(() => {});
    throw error;
  }

  const user = await requireActiveUser(identity.uid);
  const now = new Date();
  const withLogin = await getStore().update(USERS, user.id, { lastLoginAt: now, updatedAt: now });

  if (requiresMfa(user.role)) {
    const enabled = await mfa.isMfaEnabled(user.id);
    if (enabled) {
      await audit({
        actorId: user.id,
        actorRole: user.role,
        action: "login_mfa_challenge",
        resourceType: "auth",
      });
      return {
        mfaRequired: true,
        mfaToken: signMfaToken(user),
        expiresIn: env.authMfaTokenTtlSeconds,
        user: safeUser(withLogin),
      };
    }
    await audit({
      actorId: user.id,
      actorRole: user.role,
      action: "mfa_setup_required",
      resourceType: "auth",
    });
    return {
      mfaSetupRequired: true,
      setupToken: signMfaSetupToken(user),
      expiresIn: env.authMfaTokenTtlSeconds,
      user: safeUser(withLogin),
    };
  }

  const session = await createSession(user, meta);
  await audit({
    actorId: user.id,
    actorRole: user.role,
    action: "login_success",
    resourceType: "auth",
  });
  return { ...sessionPayload(withLogin, session), refreshToken: session.refreshToken };
}

export async function verifyLoginMfa({ mfaToken, code }, meta = {}) {
  const token = verifyMfaToken(mfaToken);
  const user = await requireActiveUser(token.uid);
  if (!requiresMfa(user.role)) throw httpError(400, "MFA is not required for this account");
  await mfa.verifyLoginMfa(user, code);

  const now = new Date();
  const updated = await getStore().update(USERS, user.id, {
    lastLoginAt: now,
    mfaEnabled: true,
    updatedAt: now,
  });
  const session = await createSession(updated, { ...meta, mfa: true });
  await audit({
    actorId: user.id,
    actorRole: user.role,
    action: "login_success",
    resourceType: "auth",
    metadata: { mfa: true },
  });
  return { ...sessionPayload(updated, session), refreshToken: session.refreshToken };
}

export async function beginMfaSetup({ setupToken }) {
  const token = verifyMfaSetupToken(setupToken);
  const user = await requireActiveUser(token.uid);
  if (!requiresMfa(user.role)) throw httpError(400, "MFA is not required for this account");
  if (await mfa.isMfaEnabled(user.id)) throw httpError(409, "MFA is already enabled; sign in with your authenticator code");
  const result = await mfa.beginMfaSetup(user);
  await audit({
    actorId: user.id,
    actorRole: user.role,
    action: "mfa_setup_started",
    resourceType: "user",
    resourceId: user.id,
  });
  return result;
}

export async function enableMfa({ setupToken, code }) {
  const token = verifyMfaSetupToken(setupToken);
  const user = await requireActiveUser(token.uid);
  if (!requiresMfa(user.role)) throw httpError(400, "MFA is not required for this account");
  const result = await mfa.enableMfa(user, code);
  await audit({
    actorId: user.id,
    actorRole: user.role,
    action: "mfa_enabled",
    resourceType: "user",
    resourceId: user.id,
  });
  return { ...result, next: "login" };
}

export async function refreshSessionForRequest(refreshToken, meta = {}) {
  const { session, ...tokens } = await refreshSession(refreshToken, meta);
  const user = await getStore().get(USERS, session.userId);
  if (!user) throw httpError(401, "Invalid or expired session");
  if (user.status === "disabled") {
    await revokeSession(session.id, "account_disabled");
    throw httpError(403, "Account is disabled");
  }
  await audit({
    actorId: user.id,
    actorRole: user.role,
    action: "session_refreshed",
    resourceType: "auth",
  });
  return { ...sessionPayload(user, tokens), refreshToken: tokens.refreshToken };
}

export async function logout(sessionId, actor = {}) {
  const revoked = await revokeSession(sessionId, "logout");
  if (revoked) {
    await audit({
      actorId: actor.uid ?? null,
      actorRole: actor.role ?? null,
      action: "logout",
      resourceType: "auth",
      metadata: { sessionId },
    }).catch(() => {});
  }
  return { loggedOut: true };
}

export async function logoutByRefreshToken(refreshToken) {
  if (!refreshToken) return { loggedOut: true };
  const session = await findSessionByRefreshToken(refreshToken);
  if (!session) return { loggedOut: true };
  return logout(session.id, { uid: session.userId, role: session.role });
}
