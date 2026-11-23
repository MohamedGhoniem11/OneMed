import { getIdp } from "../auth/index.js";
import { getStore } from "../store/index.js";
import { httpError } from "../utils/http-error.js";

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

function sessionPayload(user, session) {
  const payload = {
    id: user.id,
    uid: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? "",
    role: user.role,
  };
  if (session.idToken) {
    payload.idToken = session.idToken;
    payload.expiresIn = session.expiresIn ?? null;
  }
  if (session.refreshToken) payload.refreshToken = session.refreshToken;
  if (session.customToken) {
    payload.customToken = session.customToken;
    payload.requiresClientExchange = true;
  }
  return payload;
}

export async function register({ name, email, password, role, phone }) {
  const idp = getIdp();
  const store = getStore();
  const normalizedEmail = email.trim().toLowerCase();

  let uid;
  try {
    ({ uid } = await idp.createUser({ email: normalizedEmail, password, displayName: name }));
  } catch (error) {
    const status = httpStatusForAuthError(error);
    if (status === 409) throw httpError(409, "Email already exists");
    if (status) throw httpError(status, error.message);
    throw error;
  }

  try {
    await idp.setCustomUserClaims(uid, { role });
    await store.set("users", uid, {
      name,
      email: normalizedEmail,
      phone: phone || "",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    await idp.deleteUser(uid).catch(() => {});
    throw error;
  }

  const user = await store.get("users", uid);
  const session = await idp.createSession(uid);
  return sessionPayload(user, session);
}

export async function login({ email, password }) {
  const idp = getIdp();
  const store = getStore();
  const normalizedEmail = email.trim().toLowerCase();
  const session = await idp.signInWithPassword(normalizedEmail, password);
  const user = await store.get("users", session.uid);
  if (!user) {
    throw httpError(403, "No OneMed profile is linked to this account; contact an administrator.");
  }
  return sessionPayload(user, session);
}
