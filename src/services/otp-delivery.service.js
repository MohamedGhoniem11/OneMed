import { env } from "../config/env.js";
import { httpError } from "../utils/http-error.js";
import { encryptBytes, decryptBytes } from "./file-storage.service.js";

const BASE = "https://identitytoolkit.googleapis.com/v1/accounts";

function endpoint(action) {
  if (!env.firebaseApiKey) throw httpError(503, "FIREBASE_API_KEY is not configured");
  return `${BASE}:${action}?key=${encodeURIComponent(env.firebaseApiKey)}`;
}

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) throw httpError(400, "A phone number is required for phone OTP");
  return digits.startsWith("00") ? `+${digits.slice(2)}` : digits.startsWith("0") ? `+20${digits.slice(1)}` : `+${digits}`;
}

async function post(action, body) {
  let res;
  try {
    res = await fetch(endpoint(action), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw httpError(503, "OTP provider is temporarily unavailable");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || "OTP provider request failed";
    throw httpError(res.status === 400 ? 400 : 502, `OTP provider: ${message}`);
  }
  return data;
}

/** Send a code through Firebase phone Auth. Returns an encrypted provider session. */
export async function sendPhoneCode(phone) {
  const data = await post("sendVerificationCode", { phoneNumber: normalizePhone(phone) });
  if (!data.sessionInfo) throw httpError(502, "OTP provider did not return a verification session");
  const encrypted = encryptBytes(Buffer.from(data.sessionInfo, "utf8"));
  return {
    provider: "firebase-phone",
    session: {
      iv: encrypted.iv.toString("base64"),
      tag: encrypted.tag.toString("base64"),
      ciphertext: encrypted.ciphertext.toString("base64"),
    },
  };
}

/** Verify a user-entered code against Firebase phone Auth. */
export async function verifyPhoneCode(session, code) {
  try {
    const sessionInfo = decryptBytes({
      iv: Buffer.from(session.iv, "base64"),
      tag: Buffer.from(session.tag, "base64"),
      ciphertext: Buffer.from(session.ciphertext, "base64"),
    }).toString("utf8");
    const data = await post("signInWithPhoneNumber", { sessionInfo, code: String(code) });
    if (!data.idToken || !data.localId) throw httpError(400, "Invalid or expired verification code");
    return { idToken: data.idToken, uid: data.localId, phoneNumber: normalizePhone(data.phoneNumber || "") };
  } catch (error) {
    if (error?.status) throw error;
    throw httpError(400, "Invalid or expired verification code");
  }
}
