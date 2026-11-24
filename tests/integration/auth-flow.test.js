import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import { createSession } from "../../src/services/session.service.js";
import { auditInternals, appendAudit, verifyChain } from "../../src/services/audit.service.js";
import { getStore } from "../../src/store/index.js";

const api = request(app);
const PASSWORD = "secret123";

async function registerPatient(email, overrides = {}) {
  const body = {
    name: "Mona Patient",
    email,
    password: PASSWORD,
    role: "patient",
    phone: "01012345678",
    emergencyContact: { name: "Family", phone: "01000000001", relationship: "family" },
    patient: {
      nationalId: `290010101${String(Math.floor(Math.random() * 90000) + 10000)}`,
      dateOfBirth: "1990-01-10",
      gender: "male",
      bloodGroup: "O+",
      city: "Alexandria",
    },
    ...overrides,
  };
  return (await api.post("/api/auth/register").send(body).expect(201)).body;
}

async function activate(body, code) {
  return api.post("/api/auth/register/verify-otp").send({ challengeId: body.challengeId, code });
}

async function login(email, password = PASSWORD) {
  return api.post("/api/auth/login").send({ email, password });
}

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

describe("M1 auth + RBAC + audit", () => {
  let doctor;

  beforeAll(async () => {
    const reg = await registerPatient("patient-flow@example.com");
    const verify = await activate(reg, reg.devCode);
    expect(verify.status).toBe(200);

    const doctorReg = await registerPatient("doctor-flow@example.com", {
      name: "Dr. Flow Doctor",
      role: "doctor",
      phone: "+20 111 234 5678",
      patient: undefined,
      doctor: { specialty: "Cardiology", licenseNumber: "EG-FLOW-1", city: "Alexandria" },
      emergencyContact: { name: "Clinic Desk", phone: "01000000002", relationship: "work" },
    });
    const doctorVerify = await activate(doctorReg, doctorReg.devCode);
    expect(doctorVerify.body.next).toBe("login_mfa");

    const login1 = await login("doctor-flow@example.com");
    expect(login1.body.mfaSetupRequired).toBe(true);

    const setup = await api
      .post("/api/auth/mfa/setup")
      .send({ setupToken: login1.body.setupToken })
      .expect(200);
    const { generate } = await import("otplib");
    const code = await generate({ secret: setup.body.secret });

    const enabled = await api
      .post("/api/auth/mfa/enable")
      .send({ setupToken: login1.body.setupToken, code })
      .expect(200);
    expect(enabled.body.enabled).toBe(true);

    const login2 = await login("doctor-flow@example.com");
    const verified = await api
      .post("/api/auth/mfa/verify")
      .send({ mfaToken: login2.body.mfaToken, code })
      .expect(200);
    doctor = { token: verified.body.accessToken, uid: verified.body.user.uid };
  });

  it("registers + verifies a patient with OTP", async () => {
    const reg = await registerPatient("patient-one@example.com");
    expect(reg.requiresOtp).toBe(true);
    expect(reg.devCode).toMatch(/^\d{6}$/);

    const verified = await activate(reg, reg.devCode);
    expect(verified.body.verified).toBe(true);
    expect(verified.body.user.status).toBe("active");
    expect(verified.body.mfaRequired).toBe(false);
  });

  it("rejects wrong OTP codes", async () => {
    const reg = await registerPatient("patient-otp@example.com");
    const res = await api
      .post("/api/auth/register/verify-otp")
      .send({ challengeId: reg.challengeId, code: "000000" })
      .expect(401);
    expect(res.body.message).toContain("Invalid verification code");
  });

  it("logs in a patient and rotates refresh cookies", async () => {
    const reg = await registerPatient("patient-login@example.com");
    await activate(reg, reg.devCode);

    const loginRes = await login("patient-login@example.com");
    expect(loginRes.body.accessToken).toBeTruthy();
    const cookie = (loginRes.headers["set-cookie"] || []).join(";");
    expect(cookie).toContain("onemed_rt=");

    const refresh = await api.post("/api/auth/refresh").set("Cookie", cookie).expect(200);
    const newCookie = (refresh.headers["set-cookie"] || []).join(";");
    expect(newCookie).toContain("onemed_rt=");
    expect(newCookie).not.toBe(cookie);
  });

  it("revokes sessions when a rotated refresh token is replayed", async () => {
    const reg = await registerPatient("patient-reuse@example.com");
    await activate(reg, reg.devCode);
    const loginRes = await login("patient-reuse@example.com");
    const cookie = (loginRes.headers["set-cookie"] || []).join(";");

    const refresh1 = await api.post("/api/auth/refresh").set("Cookie", cookie).expect(200);
    const newCookie = (refresh1.headers["set-cookie"] || []).join(";");

    await api.post("/api/auth/refresh").set("Cookie", cookie).expect(401);
    await api.post("/api/auth/refresh").set("Cookie", newCookie).expect(401);
  });

  it("enforces staff MFA", async () => {
    const loginRes = await login("doctor-flow@example.com");
    expect(loginRes.body.mfaRequired).toBe(true);
    const wrong = await api
      .post("/api/auth/mfa/verify")
      .send({ mfaToken: loginRes.body.mfaToken, code: "000000" })
      .expect(401);
    expect(wrong.body.message).toContain("MFA");
  });

  it("enforces capability-based RBAC", async () => {
    const profile = await api.get("/api/users/me").set(bearer(doctor.token)).expect(200);
    expect(profile.body.role).toBe("doctor");
    await api.get("/api/users").set(bearer(doctor.token)).expect(403);
    await api.get("/api/audit").set(bearer(doctor.token)).expect(403);
  });

  it("verifies the audit hash chain", async () => {
    const session = await createSession(
      { id: "admin-chain", role: "admin", email: "admin-chain@example.com" },
      { mfa: false },
    );
    const verify = await api.get("/api/audit/verify").set(bearer(session.accessToken)).expect(200);
    expect(verify.body.valid).toBe(true);
    expect(verify.body.count).toBeGreaterThan(0);
  });

  it("detects tampering with an audit entry", async () => {
    await appendAudit({ action: "tamper_test_marker", resourceType: "test" });
    const before = await verifyChain();
    expect(before.valid).toBe(true);

    const store = getStore();
    const { items } = await store.query(auditInternals.COLLECTION, {
      where: [{ field: "action", op: "==", value: "tamper_test_marker" }],
      limit: 1,
    });
    expect(items).toHaveLength(1);
    await store.update(auditInternals.COLLECTION, items[0].id, { action: "tampered" });

    const after = await verifyChain();
    expect(after.valid).toBe(false);
    expect(after.brokenAt).toBeTruthy();
  });

  it("requires admin capability to verify doctors", async () => {
    await api
      .patch("/api/doctors/user-doctor/verify")
      .set(bearer(doctor.token))
      .send({ verified: true })
      .expect(403);
  });

  it("returns a JSON 400 for malformed JSON", async () => {
    const response = await api
      .post("/api/auth/register")
      .set("Content-Type", "application/json")
      .send('{"name":')
      .expect(400);
    expect(response.body.message).toBe("Invalid JSON body");
  });

  it("requires MFA setup for staff created by an admin", async () => {
    const adminSession = await createSession(
      { id: "admin-setup", role: "admin", email: "admin-setup@example.com" },
      { mfa: false },
    );
    const adminAuth = bearer(adminSession.accessToken);

    const created = await api
      .post("/api/auth/staff")
      .set(adminAuth)
      .send({
        name: "Lab Tech One",
        email: "labtech-one@example.com",
        password: "staffpass123",
        role: "lab_staff",
        phone: "01234567890",
        emergencyContact: { name: "Lab Desk", phone: "01000000003", relationship: "work" },
      })
      .expect(201);
    expect(created.body.requiresOtp).toBe(true);

    const verified = await api
      .post("/api/auth/staff/verify-otp")
      .send({ challengeId: created.body.challengeId, code: created.body.devCode })
      .expect(200);
    expect(verified.body.next).toBe("login_mfa");

    const loginRes = await login("labtech-one@example.com", "staffpass123");
    expect(loginRes.body.mfaSetupRequired).toBe(true);
  });

  it("rejects duplicate email and self-registered staff roles", async () => {
    const dup = await api
      .post("/api/auth/register")
      .send({
        name: "Dup Patient",
        email: "patient-one@example.com",
        password: PASSWORD,
        role: "patient",
        phone: "01012345678",
        emergencyContact: { name: "Family", phone: "01000000001", relationship: "family" },
        patient: {
          nationalId: "29001019999999",
          dateOfBirth: "1990-01-10",
          gender: "male",
          bloodGroup: "O+",
          city: "Alexandria",
        },
      })
      .expect(409);
    expect(dup.body.message).toBe("Email already exists");

    const staff = await api
      .post("/api/auth/register")
      .send({
        name: "Sneaky Staff",
        email: "sneaky@example.com",
        password: PASSWORD,
        role: "admin",
        phone: "01012345678",
        emergencyContact: { name: "Family", phone: "01000000001", relationship: "family" },
      })
      .expect(400);
    expect(staff.body.message).toContain("role");
  });

  it("keeps role assignment server-controlled", async () => {
    const reg = await registerPatient("patient-role@example.com");
    const verified = await activate(reg, reg.devCode);
    expect(verified.body.user.role).toBe("patient");
  });
});