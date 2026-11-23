import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../../src/app.js";
import { getIdp } from "../../src/auth/index.js";
import { getStore } from "../../src/store/index.js";

const api = request(app);

const PATIENT = {
  name: "Mona Patient",
  email: "mona.patient@example.com",
  password: "secret123",
  role: "patient",
  phone: "01012345678",
};

const DOCTOR = {
  name: "Dr. Karim Hassan",
  email: "karim.doctor@example.com",
  password: "secret123",
  role: "doctor",
  phone: "+20 111 234 5678",
};

let patientToken;
let patientId;
let doctorToken;
let doctorId;

describe("API foundations (local mode)", () => {
  it("boots credential-free and reports its mode", async () => {
    const response = await api.get("/").expect(200);
    expect(response.body).toMatchObject({ status: "ok", persistence: "local", authProvider: "local" });
    expect(response.headers["x-powered-by"]).toBeUndefined();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-request-id"]).toBeTruthy();
  });

  it("protects authenticated routes with a JSON 401", async () => {
    const response = await api.get("/api/users/me").expect(401);
    expect(response.body.message).toBe("Missing token");
    expect(response.body.requestId).toBeTruthy();
  });

  it("validates registration input", async () => {
    await api.post("/api/auth/register").send({ ...PATIENT, role: "admin" }).expect(400);
    await api.post("/api/auth/register").send({ ...PATIENT, phone: "01300000000" }).expect(400);
    await api.post("/api/auth/register").send({ ...PATIENT, password: "123" }).expect(400);
    await api.post("/api/auth/register").send({ name: "No Email" }).expect(400);
  });

  it("registers a patient, signs in, and reads the profile", async () => {
    const registered = await api.post("/api/auth/register").send(PATIENT).expect(201);
    expect(registered.body).toMatchObject({
      name: PATIENT.name,
      email: PATIENT.email,
      role: "patient",
      phone: "01012345678",
    });
    expect(registered.body.idToken).toEqual(expect.any(String));
    expect(registered.body.expiresIn).toBe(900);

    patientId = registered.body.id;
    patientToken = registered.body.idToken;

    const me = await api.get("/api/users/me").set("Authorization", `Bearer ${patientToken}`).expect(200);
    expect(me.body).toMatchObject({ id: patientId, name: PATIENT.name, role: "patient" });

    await api.post("/api/auth/register").send(PATIENT).expect(409);
  });

  it("supports login and rejects wrong passwords and tampered tokens", async () => {
    const login = await api
      .post("/api/auth/login")
      .send({ email: PATIENT.email, password: PATIENT.password })
      .expect(200);
    expect(login.body.idToken).toEqual(expect.any(String));

    await api
      .post("/api/auth/login")
      .send({ email: PATIENT.email, password: "wrong-password" })
      .expect(401);

    const tampered = `${login.body.idToken.slice(0, -2)}xy`;
    await api.get("/api/users/me").set("Authorization", `Bearer ${tampered}`).expect(401);
  });

  it("creates a doctor profile and enforces role guards", async () => {
    const registered = await api.post("/api/auth/register").send(DOCTOR).expect(201);
    doctorToken = registered.body.idToken;
    doctorId = registered.body.id;

    const auth = (token) => ({ Authorization: `Bearer ${token}` });

    const saved = await api
      .put("/api/doctors/me")
      .set(auth(doctorToken))
      .send({
        specialty: "Cardiology",
        licenseNumber: "EG-12345",
        city: "Alexandria",
        yearsOfExperience: 8,
      })
      .expect(200);
    expect(saved.body).toMatchObject({ id: doctorId, specialty: "Cardiology", verified: false });

    const profile = await api.get("/api/doctors/me").set(auth(doctorToken)).expect(200);
    expect(profile.body.licenseNumber).toBe("EG-12345");

    const list = await api.get("/api/doctors").set(auth(patientToken)).expect(200);
    expect(list.body.doctors).toHaveLength(0); // unverified doctors are hidden from non-admins

    await api.get("/api/doctors/me").set(auth(patientToken)).expect(403);
    await api.get("/api/users").set(auth(patientToken)).expect(403);
    await api.get("/api/users").set(auth(doctorToken)).expect(403);
  });

  it("persists a reviewed prescription through the storage port", async () => {
    const auth = (token) => ({ Authorization: `Bearer ${token}` });
    const payload = {
      patientId,
      diagnosis: "Bacterial sinusitis",
      items: [{ name: "Amoxicillin", dose: "500mg", frequency: "1x3", duration: "5 days" }],
    };

    await api.post("/api/prescriptions").send(payload).expect(401);
    await api.post("/api/prescriptions").set(auth(patientToken)).send(payload).expect(403);

    const created = await api.post("/api/prescriptions").set(auth(doctorToken)).send(payload).expect(201);
    expect(created.body).toMatchObject({
      doctorId,
      patientId,
      status: "confirmed",
      items: [{ name: "Amoxicillin" }],
    });
    expect(created.body.id).toBeTruthy();

    const list = await api
      .get("/api/prescriptions")
      .set(auth(doctorToken))
      .expect(200);
    expect(list.body.prescriptions.map((item) => item.id)).toContain(created.body.id);

    const one = await api
      .get(`/api/prescriptions/${created.body.id}`)
      .set(auth(doctorToken))
      .expect(200);
    expect(one.body.id).toBe(created.body.id);

    await api
      .post("/api/prescriptions")
      .set(auth(doctorToken))
      .send({ patientId, items: [] })
      .expect(400);
  });

  it("enforces CORS allowlisting and returns safe errors", async () => {
    await api.get("/").set("Origin", "http://evil.example").expect(403);

    const allowed = await api.get("/").set("Origin", "http://localhost:5173").expect(200);
    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:5173");

    const malformed = await api
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email":')
      .expect(400);
    expect(malformed.body.message).toBe("Invalid JSON body");

    const missing = await api.get("/api/does-not-exist").expect(404);
    expect(missing.body.message).toContain("not found");
  });

  it("lets an administrator manage users with all six roles", async () => {
    await getIdp().setCustomUserClaims(patientId, { role: "admin" });
    await getStore().update("users", patientId, { role: "admin" });

    const relogin = await api
      .post("/api/auth/login")
      .send({ email: PATIENT.email, password: PATIENT.password })
      .expect(200);
    patientToken = relogin.body.idToken;

    const users = await api
      .get("/api/users")
      .set("Authorization", `Bearer ${patientToken}`)
      .expect(200);
    expect(users.body.users.length).toBeGreaterThanOrEqual(2);

    await api
      .patch(`/api/doctors/${doctorId}/verify`)
      .set("Authorization", `Bearer ${patientToken}`)
      .send({ verified: true })
      .expect(200);

    const doctors = await api
      .get("/api/doctors")
      .set("Authorization", `Bearer ${patientToken}`)
      .expect(200);
    expect(doctors.body.doctors).toHaveLength(1);
    expect(doctors.body.doctors[0]).toMatchObject({ id: doctorId, verified: true });

    await api
      .patch(`/api/users/${doctorId}/role`)
      .set("Authorization", `Bearer ${patientToken}`)
      .send({ role: "lab_staff" })
      .expect(200);

    await api
      .patch(`/api/users/${doctorId}/role`)
      .set("Authorization", `Bearer ${patientToken}`)
      .send({ role: "superuser" })
      .expect(400);
  });
});
