import { describe, expect, it } from "vitest";
import { doctorSchema } from "../../src/schemas/doctor.schema.js";
import { loginSchema, registerSchema } from "../../src/schemas/user.schema.js";
import { validate } from "../../src/utils/schema.js";

describe("schema validation", () => {
  it("validates and normalizes a patient registration", () => {
    const data = validate(registerSchema, {
      name: "  Mona Ali  ",
      email: " mona@example.com ",
      password: "secret123",
      role: "patient",
      phone: "+20 101 234 5678",
    });
    expect(data.name).toBe("Mona Ali");
    expect(data.email).toBe("mona@example.com");
    expect(data.phone).toBe("01012345678");
  });

  it("rejects staff roles on public self-registration", () => {
    expect(() =>
      validate(registerSchema, {
        name: "Mona Ali",
        email: "mona@example.com",
        password: "secret123",
        role: "admin",
      }),
    ).toThrow(/role must be one of/);
  });

  it("rejects invalid phones and short passwords", () => {
    const base = {
      name: "Mona Ali",
      email: "mona@example.com",
      password: "secret123",
      role: "patient",
    };
    expect(() => validate(registerSchema, { ...base, phone: "01300000000" })).toThrow(/phone/);
    expect(() => validate(registerSchema, { ...base, password: "123" })).toThrow(/at least 6/);
  });

  it("requires all login fields", () => {
    expect(() => validate(loginSchema, { email: "mona@example.com" })).toThrow(/password is required/);
  });

  it("requires a license number once (B4 regression)", () => {
    expect(() => validate(doctorSchema, { specialty: "Cardiology" })).toThrow(/licenseNumber is required/);
    const data = validate(doctorSchema, { specialty: "Cardiology", licenseNumber: "EG-12345" });
    expect(data.licenseNumber).toBe("EG-12345");
  });

  it("ignores unknown fields and supports partial updates", () => {
    const created = validate(doctorSchema, {
      specialty: "Cardiology",
      licenseNumber: "EG-12345",
      isSuperAdmin: true,
    });
    expect(created).not.toHaveProperty("isSuperAdmin");

    const patch = validate(doctorSchema, { city: "Alexandria" }, { partial: true });
    expect(patch).toEqual({ city: "Alexandria" });
  });
});
