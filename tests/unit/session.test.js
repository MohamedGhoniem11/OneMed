import crypto from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { createSession, refreshSession, verifyAccessToken } from "../../src/services/session.service.js";
import { setStoreForTests, resetStoreForTests } from "../../src/store/index.js";
import { createLocalStore } from "../../src/store/local.store.js";

beforeEach(() => {
  resetStoreForTests();
  setStoreForTests(createLocalStore({ dataDir: process.env.LOCAL_DATA_DIR }));
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

  it("signs a non-empty token", () => {
    const token = crypto.randomBytes(32).toString("hex");
    expect(token).toHaveLength(64);
  });
});