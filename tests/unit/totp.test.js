import { generateSecret } from "otplib";
import { describe, expect, it } from "vitest";

describe("TOTP secret generation", () => {
  it("produces a valid base32 secret", () => {
    const secret = generateSecret();
    expect(secret).toMatch(/^[A-Z2-7]{20,}$/);
  });
});