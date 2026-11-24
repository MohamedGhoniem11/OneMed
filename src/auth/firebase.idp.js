import { env } from "../config/env.js";
import { getAuth } from "../config/firebase.js";
import { httpError } from "../utils/http-error.js";

/**
 * Firebase Authentication adapter (production). The Admin SDK manages accounts
 * and verifies ID tokens; password sign-in uses the Identity Toolkit REST API
 * with the public Web API key, as required by Firebase.
 */

function identityToolkitBase() {
  if (env.firebaseAuthEmulatorHost) {
    const host = env.firebaseAuthEmulatorHost.replace(/^https?:\/\//, "");
    return `http://${host}/identitytoolkit.googleapis.com/v1`;
  }
  return "https://identitytoolkit.googleapis.com/v1";
}

async function callIdentityToolkit(path, body) {
  if (!env.firebaseApiKey) {
    throw httpError(
      503,
      "Firebase password sign-in requires FIREBASE_API_KEY (the Firebase Web API key). " +
        "Alternatively sign in with the Firebase client SDK and send the ID token as a Bearer token.",
    );
  }
  const response = await fetch(`${identityToolkitBase()}/${path}?key=${encodeURIComponent(env.firebaseApiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(httpError(502, "Firebase authentication request failed"), {
      firebaseCode: data?.error?.message || `HTTP_${response.status}`,
    });
  }
  return data;
}

export function createFirebaseIdp() {
  return {
    kind: "firebase",

    async createUser({ uid, email, password, displayName }) {
      const user = await getAuth().createUser({ uid, email, password, displayName });
      return { uid: user.uid };
    },

    async setCustomUserClaims(uid, claims) {
      await getAuth().setCustomUserClaims(uid, claims);
    },

    async updateUser(uid, data) {
      await getAuth().updateUser(uid, data);
    },

    async deleteUser(uid) {
      await getAuth().deleteUser(uid);
    },

    async getUserByEmail(email) {
      try {
        const user = await getAuth().getUserByEmail(email);
        return { uid: user.uid, email: user.email, displayName: user.displayName };
      } catch (error) {
        if (error.code === "auth/user-not-found") return null;
        throw error;
      }
    },

    verifyIdToken: async (token) => {
      const decoded = await getAuth().verifyIdToken(token);
      return { uid: decoded.uid, email: decoded.email ?? null, role: decoded.role ?? null };
    },

    async createSession(uid) {
      const customToken = await getAuth().createCustomToken(uid);
      if (!env.firebaseApiKey) {
        // Honest, explicit fallback: the client SDK exchanges this token.
        return { customToken, requiresClientExchange: true };
      }
      const data = await callIdentityToolkit("accounts:signInWithCustomToken", {
        token: customToken,
        returnSecureToken: true,
      });
      return {
        idToken: data.idToken,
        refreshToken: data.refreshToken,
        expiresIn: Number(data.expiresIn) || null,
      };
    },

    async signInWithPassword(email, password) {
      let data;
      try {
        data = await callIdentityToolkit("accounts:signInWithPassword", {
          email,
          password,
          returnSecureToken: true,
        });
      } catch (error) {
        const code = error.firebaseCode;
        if (["EMAIL_NOT_FOUND", "INVALID_PASSWORD", "INVALID_LOGIN_CREDENTIALS", "INVALID_EMAIL"].includes(code)) {
          throw httpError(401, "Invalid email or password");
        }
        if (code === "USER_DISABLED") throw httpError(403, "Account is disabled");
        if (code === "TOO_MANY_ATTEMPTS_TRY_LATER") {
          throw httpError(429, "Too many failed attempts; try again later");
        }
        throw error;
      }
      const decoded = await getAuth().verifyIdToken(data.idToken);
      return {
        uid: decoded.uid,
        role: decoded.role ?? null,
        idToken: data.idToken,
        refreshToken: data.refreshToken,
        expiresIn: Number(data.expiresIn) || null,
      };
    },
  };
}
