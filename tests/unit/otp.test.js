import { beforeEach, describe, expect, it } from "vitest";
import { createOtpChallenge, verifyOtpChallenge } from "../../src/services/otp.service.js";
import { createLocalStore } from "../../src/store/local.store.js";
import { resetStoreForTests, setStoreForTests } from "../../src/store/index.js";

beforeEach(() => {
  resetStoreForTests();
  setStoreForTests(createLocalStore({ dataDir: process.env.LOCAL_DATA_DIR }));
});

describe("OTP challenges", () => {
  it("issues a single-use code", async () => {
    const challenge = await createOtpChallenge({ userId: "u1", email: "u1@example.com" });
    expect(challenge.devCode).toMatch(/^\d{6}$/);

    const result = await verifyOtpChallenge({ challengeId: challenge.challengeId, code: challenge.devCode });
    expect(result.userId).toBe("u1");

    await expect(
      verifyOtpChallenge({ challengeId: challenge.challengeId, code: challenge.devCode }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects a wrong code and increments attempts", async () => {
    const challenge = await createOtpChallenge({ userId: "u2", email: "u2@example.com" });
    await expect(
      verifyOtpChallenge({ challengeId: challenge.challengeId, code: "000000" }),
    ).rejects.toMatchObject({ status: 401 });
  });
});