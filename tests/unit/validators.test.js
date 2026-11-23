import { describe, expect, it } from "vitest";
import { EG_PHONE, isValidPhone, normalizePhone } from "../../src/utils/validators.js";

describe("validators", () => {
  it("normalizes spaces, hyphens, and the +20 prefix", () => {
    expect(normalizePhone(" +20 101-234-5678 ")).toBe("01012345678");
    expect(normalizePhone("0101 234 5678")).toBe("01012345678");
  });

  it("accepts every Egyptian mobile prefix", () => {
    for (const prefix of ["010", "011", "012", "015"]) {
      expect(isValidPhone(`${prefix}12345678`)).toBe(true);
    }
  });

  it("rejects wrong prefixes, lengths, and non-digits", () => {
    expect(isValidPhone("01312345678")).toBe(false);
    expect(isValidPhone("0101234567")).toBe(false);
    expect(isValidPhone("010123456789")).toBe(false);
    expect(isValidPhone("0101234abcd")).toBe(false);
  });

  it("exports a reusable pattern", () => {
    expect(EG_PHONE.test("01212345678")).toBe(true);
    expect(EG_PHONE.test("+201012345678")).toBe(false); // normalize first
  });
});
