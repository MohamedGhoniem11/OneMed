import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import { createSession } from "../../src/services/session.service.js";

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
      nationalId: `2900101${String(Math.floor(Math.random() * 900000) + 100000)}`,
      dateOfBirth: "1990-01-10",
      gender: "male",
      bloodGroup: "O+",
      city: "Alexandria",
    },
    ...overrides,
  };
  return (await request(app).post("/api/auth/register").send(body).expect(201)).body;
}

async function activate(body, code) {
  return request(app).post("/api/auth/register/verify-otp").send({ challengeId: body.challengeId, code });
}

async function login(email, password = PASSWORD) {
  return request(app).post("/api/auth/login").send({ email, password });
}

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

describe("API foundations (local mode, post-M1)", () => {
  let doctor;
  let admin;

  beforeAll(async () => {
    const reg = await registerPatient("foundations-patient@example.com");
    await activate(reg, reg.devCode);

    const doctorReg = await registerPatient("foundations-doctor@example.com", {
      name: "Dr. Foundations",
      role: "doctor",
      phone: "+20 111 888 7766",
      patient: undefined,
      doctor: { specialty: "Cardiology", licenseNumber: "EG-FOUND-1", city: "Alexandria" },
      emergencyContact: { name: "Clinic", phone: "01000000008", relationship: "work" },
    });
    const doctorVerify = await activate(doctorReg, doctorReg.devCode);
    expect(doctorVerify.body.next).toBe("login_mfa");

    const login1 = await login("foundations-doctor@example.com");
    const setup = await request(app)
      .post("/api/auth/mfa/setup")
      .send({ setupToken: login1.body.setupToken })
      .expect(200);
    const { generate } = await import("otplib");
    const code = await generate({ secret: setup.body.secret });

    await request(app)
      .post("/api/auth/mfa/enable")
      .send({ setupToken: login1.body.setupToken, code })
      .expect(200);

    const login2 = await login("foundations-doctor@example.com");
    const verified = await request(app)
      .post("/api/auth/mfa/verify")
      .send({ mfaToken: login2.body.mfaToken, code })
      .expect(200);
    doctor = { token: verified.body.accessToken, uid: verified.body.user.uid };

    const adminSession = await createSession(
      { id: "foundations-admin", role: "admin", email: "foundations-admin@example.com" },
      { mfa: false },
    );
    admin = { token: adminSession.accessToken };
  });

  it("boots credential-free and reports its mode", async () => {
    const response = await request(app).get("/").expect(200);
    expect(response.body).toMatchObject({ status: "ok", persistence: "local", authProvider: "local" });
    expect(response.headers["x-powered-by"]).toBeUndefined();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-request-id"]).toBeTruthy();
  });

  it("protects authenticated routes with a JSON 401", async () => {
    const response = await request(app).get("/api/users/me").expect(401);
    expect(response.body.message).toBe("Missing token");
  });

  it("validates registration input", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({
        name: "Bad",
        email: "bad@example.com",
        password: "short",
        role: "admin",
        phone: "01300000000",
        emergencyContact: { name: "X", phone: "01300000000", relationship: "family" },
      })
      .expect(400);
  });

  it("enforces admin role guards and doctor verification", async () => {
    await request(app).get("/api/users").set(bearer(doctor.token)).expect(403);

    const users = await request(app).get("/api/users").set(bearer(admin.token)).expect(200);
    expect(users.body.users.length).toBeGreaterThanOrEqual(1);

    const verified = await request(app)
      .patch(`/api/doctors/${doctor.uid}/verify`)
      .set(bearer(admin.token))
      .send({ verified: true })
      .expect(200);
    expect(verified.body.verified).toBe(true);

    const list = await request(app).get("/api/doctors").set(bearer(doctor.token)).expect(200);
    expect(list.body.doctors.some((d) => (d.id ?? d.uid) === doctor.uid)).toBe(true);
  });

  it("stores a prescription for the owning doctor", async () => {
    const created = await request(app)
      .post("/api/prescriptions")
      .set(bearer(doctor.token))
      .send({
        patientId: "foundations-patient",
        diagnosis: "Legacy test",
        items: [{ name: "Amoxicillin", dose: "500mg", frequency: "1x3", duration: "5 days" }],
      })
      .expect(201);
    expect(created.body.doctorId).toBe(doctor.uid);
  });

  it("enforces CORS allowlisting", async () => {
    await request(app).get("/").set("Origin", "http://evil.example").expect(403);
    const allowed = await request(app).get("/").set("Origin", "http://localhost:5173").expect(200);
    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("returns a JSON 404 and malformed JSON 400", async () => {
    const missing = await request(app).get("/api/does-not-exist").expect(404);
    expect(missing.body.message).toContain("not found");

    const malformed = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email":')
      .expect(400);
    expect(malformed.body.message).toBe("Invalid JSON body");
  });
});