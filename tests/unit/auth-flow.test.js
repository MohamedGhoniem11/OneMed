import crypto from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { generate, generateSecret, verify } from "otplib";
import { auditInternals, appendAudit, verifyChain } from "../../src/services/audit.service.js";
import { getStore, setStoreForTests, resetStoreForTests } from "../../src/store/index.js";
import { createLocalStore } from "../../src/store/local.store.js";
import { createSession, refreshSession, verifyAccessToken } from "../../src/services/session.service.js";
import { isMfaEnabled } from "../../src/services/mfa.service.js";
import { createOtpChallenge, verifyOtpChallenge } from "../../src/services/otp.service.js";

function freshStore() {
  const store = createLocalStore({ dataDir: process.env.LOCAL_DATA_DIR });
  setStoreForTests(store);
  return store;
}

beforeEach(() => {
  resetStoreForTests();
  freshStore();
});

describe("audit hash chain", () => {
  it("appends entries with a linked SHA-256 chain and verifies", async () => {
    const first = await appendAudit({ action: "one", actorId: "u1" });
    const second = await appendAudit({ action: "two", actorId: "u1" });
    expect(second.seq).toBe(2);
    expect(second.prevHash).toBe(first.hash);

    const result = await verifyChain();
    expect(result.valid).toBe(true);
    expect(result.count).toBe(2);
  });

  it("detects tampering with an entry", async () => {
    const entry = await appendAudit({ action: "original" });
    const store = getStore();
    await store.update(auditInternals.COLLECTION, entry.id, { action: "tampered" });
    const result = await verifyChain();
    expect(result.valid).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it("detects deletion of an entry as a sequence gap", async () => {
    const first = await appendAudit({ action: "first" });
    await appendAudit({ action: "second" });
    await getStore().delete(auditInternals.COLLECTION, first.id);
    const result = await verifyChain();
    expect(result.valid).toBe(false);
  });
});

describe("session rotation", () => {
  it("issues a 15-minute access token and rotates refresh tokens", async () => {
    const user = { id: "u-session", role: "patient", email: "s@example.com" };
    const created = await createSession(user, { ip: "127.0.0.1" });
    expect(created.expiresIn).toBe(900);

    const decoded = verifyAccessToken(created.accessToken);
    expect(decoded.uid).toBe("u-session");
    expect(decoded.sessionId).toBe(created.session.id);

    const refreshed = await refreshSession(created.refreshToken);
    expect(refreshed.refreshToken).not.toBe(created.refreshToken);

    await expect(refreshSession(created.refreshToken)).rejects.toMatchObject({ status: 401 });
  });

  it("revokes the session family on refresh token reuse", async () => {
    const user = { id: "u-reuse", role: "doctor", email: "r@example.com" };
    const created = await createSession(user);
    const refreshed = await refreshSession(created.refreshToken);

    await expect(refreshSession(created.refreshToken)).rejects.toMatchObject({ status: 401 });
    await expect(refreshSession(refreshed.refreshToken)).rejects.toMatchObject({ status: 401 });
  });
});

describe("TOTP MFA + OTP", () => {
  it("verifies a valid TOTP code and rejects a wrong one", async () => {
    // otplib requires RFC 4648 Base32, not Base64.
    const secret = generateSecret();
    const code = await generate({ secret });
    const result = await verify({ token: code, secret, window: 1 });
    expect(result.valid).toBe(true);
    expect((await verify({ token: "000000", secret, window: 1 })).valid).toBe(false);
    void isMfaEnabled;
  });

  it("issues a single-use OTP challenge", async () => {
    const challenge = await createOtpChallenge({ userId: "u1", email: "u1@example.com" });
    expect(challenge.devCode).toMatch(/^\d{6}$/);

    const result = await verifyOtpChallenge({ challengeId: challenge.challengeId, code: challenge.devCode });
    expect(result.userId).toBe("u1");

    await expect(
      verifyOtpChallenge({ challengeId: challenge.challengeId, code: challenge.devCode }),
    ).rejects.toMatchObject({ status: 400 });
  });
});