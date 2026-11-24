import crypto from "node:crypto";
import { promisify } from "node:util";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { getStore } from "../store/index.js";
import { httpError } from "../utils/http-error.js";
import { getJwtSecret } from "./jwt-secret.js";

const scrypt = promisify(crypto.scrypt);
const AUTH_COLLECTION = "authUsers";
const KEY_LENGTH = 64;
const DUMMY_SALT = "0".repeat(32);

const normalizeEmail = (email) => String(email).trim().toLowerCase();
const withCode = (error, code) => Object.assign(error, { code });

async function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return { salt, hash: derived.toString("hex") };
}

async function verifyPassword(password, salt, expectedHex) {
  const derived = await scrypt(password, salt, KEY_LENGTH);
  const expected = Buffer.from(expectedHex, "hex");
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

function signAccessToken(authUser) {
  const role = authUser.claims?.role ?? null;
  return jwt.sign({ email: authUser.email, role }, getJwtSecret(), {
    algorithm: "HS256",
    subject: authUser.id,
    issuer: env.authJwtIssuer,
    audience: env.authJwtAudience,
    expiresIn: env.authAccessTtlSeconds,
  });
}

async function findAuthUserByEmail(email) {
  const { items } = await getStore().query(AUTH_COLLECTION, {
    where: [{ field: "email", op: "==", value: normalizeEmail(email) }],
    limit: 1,
  });
  return items[0] ?? null;
}

/**
 * Offline identity provider used for demos/CI. Real password hashing and real
 * signed sessions; it is not a mock. Production uses Firebase Auth instead.
 */
export function createLocalIdp() {
  return {
    kind: "local",

    async createUser({ uid, email, password, displayName }) {
      const normalized = normalizeEmail(email);
      if (await findAuthUserByEmail(normalized)) {
        throw withCode(httpError(409, "Email already exists"), "auth/email-already-exists");
      }
      const { salt, hash } = await hashPassword(password);
      const id = uid || crypto.randomUUID();
      await getStore().set(AUTH_COLLECTION, id, {
        email: normalized,
        displayName: displayName || "",
        passwordSalt: salt,
        passwordHash: hash,
        claims: {},
        disabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { uid: id };
    },

    async setCustomUserClaims(uid, claims) {
      const user = await getStore().get(AUTH_COLLECTION, uid);
      if (!user) throw withCode(httpError(404, "Auth user not found"), "auth/user-not-found");
      await getStore().update(AUTH_COLLECTION, uid, {
        claims: { ...(user.claims || {}), ...claims },
        updatedAt: new Date(),
      });
    },

    async updateUser(uid, data) {
      const user = await getStore().get(AUTH_COLLECTION, uid);
      if (!user) throw withCode(httpError(404, "Auth user not found"), "auth/user-not-found");
      const patch = { updatedAt: new Date() };
      if (typeof data.displayName === "string") patch.displayName = data.displayName;
      await getStore().update(AUTH_COLLECTION, uid, patch);
    },

    async deleteUser(uid) {
      const removed = await getStore().delete(AUTH_COLLECTION, uid);
      if (!removed) throw withCode(httpError(404, "Auth user not found"), "auth/user-not-found");
    },

    async getUserByEmail(email) {
      const user = await findAuthUserByEmail(email);
      return user ? { uid: user.id, email: user.email, displayName: user.displayName } : null;
    },

    async createSession(uid) {
      const user = await getStore().get(AUTH_COLLECTION, uid);
      if (!user) throw withCode(httpError(404, "Auth user not found"), "auth/user-not-found");
      if (user.disabled) throw httpError(403, "Account is disabled");
      return { idToken: signAccessToken(user), expiresIn: env.authAccessTtlSeconds };
    },

    async signInWithPassword(email, password) {
      const user = await findAuthUserByEmail(email);
      if (!user) {
        // Equalize timing with the normal path to avoid user enumeration.
        await scrypt(password || "", DUMMY_SALT, KEY_LENGTH);
        throw httpError(401, "Invalid email or password");
      }
      const valid = await verifyPassword(password || "", user.passwordSalt, user.passwordHash);
      if (!valid) throw httpError(401, "Invalid email or password");
      if (user.disabled) throw httpError(403, "Account is disabled");
      return {
        uid: user.id,
        role: user.claims?.role ?? null,
        idToken: signAccessToken(user),
        expiresIn: env.authAccessTtlSeconds,
      };
    },

    async verifyIdToken(token) {
      try {
        const payload = jwt.verify(token, getJwtSecret(), {
          algorithms: ["HS256"],
          issuer: env.authJwtIssuer,
          audience: env.authJwtAudience,
        });
        if (typeof payload === "string" || !payload.sub) throw new Error("Malformed token payload");
        return { uid: payload.sub, email: payload.email ?? null, role: payload.role ?? null };
      } catch {
        throw httpError(401, "Invalid or expired token");
      }
    },
  };
}
