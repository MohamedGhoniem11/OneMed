import crypto from "node:crypto";
import { getIdp } from "../auth/index.js";
import { requiresMfa } from "../constants/auth.js";
import { getStore } from "../store/index.js";
import { httpError } from "../utils/http-error.js";
import { appendAudit } from "./audit.service.js";
import * as otp from "./otp.service.js";

/**
 * Admin provisioning of staff accounts (lab staff, pharmacy, hospital admin).
 * They cannot self-register. The admin chooses a temporary password, the new
 * user must complete OTP verification and TOTP MFA before receiving a session.
 */

const USERS = "users";

async function findByEmail(email) {
  const { items } = await getStore().query(USERS, {
    where: [{ field: "email", op: "==", value: email.trim().toLowerCase() }],
    limit: 1,
  });
  return items[0] ?? null;
}

function temporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(12);
  let out = "";
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return out;
}

function idpErrorStatus(error) {
  switch (error?.code) {
    case "auth/email-already-exists":
      return 409;
    case "auth/invalid-email":
    case "auth/invalid-password":
    case "auth/weak-password":
      return 400;
    default:
      return null;
  }
}

export async function createStaffAccount({ name, email, password, role, phone, emergencyContact }, actor, _meta = {}) {
  const idp = getIdp();
  const store = getStore();
  const normalizedEmail = email.trim().toLowerCase();
  if (await findByEmail(normalizedEmail)) throw httpError(409, "Email already exists");

  const effectivePassword = password || temporaryPassword();
  if (!requiresMfa(role)) throw httpError(400, "This endpoint only provisions MFA-required staff roles");

  let uid;
  try {
    ({ uid } = await idp.createUser({ email: normalizedEmail, password: effectivePassword, displayName: name }));
  } catch (error) {
    const status = idpErrorStatus(error);
    if (status === 409) throw httpError(409, "Email already exists");
    if (status) throw httpError(status, error.message);
    throw error;
  }

  try {
    const now = new Date();
    await idp.setCustomUserClaims(uid, { role });
    await store.set(USERS, uid, {
      name,
      email: normalizedEmail,
      phone,
      role,
      status: "pending_verification",
      emailVerified: false,
      mfaEnabled: false,
      emergencyContact,
      createdBy: actor.uid,
      createdAt: now,
      updatedAt: now,
    });

    const challenge = await otp.createOtpChallenge({
      userId: uid,
      email: normalizedEmail,
      phone,
      purpose: "staff_activation",
      name,
    });

    await appendAudit({
      actorId: actor.uid,
      actorRole: actor.role,
      action: "staff_account_created",
      resourceType: "user",
      resourceId: uid,
      metadata: { role },
    }).catch((error) => console.error("[audit] append failed", error));

    return {
      user: { id: uid, name, email: normalizedEmail, phone, role, status: "pending_verification" },
      requiresOtp: true,
      ...(password ? {} : { note: "A temporary password was generated. Share it through a secure channel." }),
      ...challenge,
    };
  } catch (error) {
    await store.delete(USERS, uid).catch(() => {});
    await idp.deleteUser(uid).catch(() => {});
    throw error;
  }
}

export async function verifyStaffOtp({ challengeId, code }, actor, _meta = {}) {
  const challenge = await otp.verifyOtpChallenge({ challengeId, code, purpose: "staff_activation" });
  const user = await getStore().get(USERS, challenge.userId);
  if (!user) throw httpError(404, "Account not found");

  const now = new Date();
  const updated = await getStore().update(USERS, user.id, {
    status: "active",
    emailVerified: true,
    emailVerifiedAt: now,
    updatedAt: now,
  });

  await appendAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "staff_email_verified",
    resourceType: "user",
    resourceId: user.id,
    metadata: { verifiedBy: actor.uid },
  }).catch((error) => console.error("[audit] append failed", error));

  return {
    verified: true,
    user: { id: updated.id, name: updated.name, email: updated.email, role: updated.role, status: updated.status },
    next: requiresMfa(user.role) ? "login_mfa" : "login",
    mfaRequired: requiresMfa(user.role),
  };
}