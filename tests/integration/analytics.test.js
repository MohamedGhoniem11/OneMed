import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import { createSession } from "../../src/services/session.service.js";
import { getStore } from "../../src/store/index.js";

const api = request(app);
const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const PATIENT = "user_m6_patient";
const DOCTOR = "user_m6_doctor";
const STRANGER = "user_m6_stranger";
const ADMIN = "user_m6_admin";
const HOSPITAL = "user_m6_hospital";

let patientToken, doctorToken, strangerToken, adminToken, hospitalToken;

beforeAll(async () => {
  const store = getStore();
  for (const user of [
    { id: PATIENT, role: "patient" },
    { id: DOCTOR, role: "doctor" },
    { id: STRANGER, role: "doctor" },
    { id: ADMIN, role: "admin" },
    { id: HOSPITAL, role: "hospital_admin" },
  ]) {
    await store.set("users", user.id, { ...user, email: `${user.id}@m6.test`, name: `M6 ${user.role}`, status: "active", institutionId: user.id === HOSPITAL ? "inst_m6" : undefined, createdAt: new Date() });
  }
  await store.set("patients", PATIENT, {
    id: PATIENT, name: "M6 Analytics Patient", nationalId: "29001010107777", gender: "female",
    bloodGroup: "A+", city: "Alexandria", allergies: ["Penicillin"],
    chronicDiseases: ["Diabetes Mellitus"], dateOfBirth: "1985-05-05", createdAt: new Date(),
  });
  await store.set("records", "rec_m6_1", {
    id: "rec_m6_1", patientId: PATIENT, type: "lab", title: "HbA1c", institutionId: "inst_m6",
    data: { hba1c: 7.2, ldl: 130, hdl: 45 }, status: "abnormal", observedAt: "2026-01-15T09:00:00Z", reviewed: true, createdAt: new Date(),
  });
  await store.set("records", "rec_m6_2", {
    id: "rec_m6_2", patientId: PATIENT, type: "vital", title: "Blood pressure", institutionId: "inst_m6",
    data: { systolic: 138, diastolic: 88 }, status: "abnormal", observedAt: "2026-02-15T09:00:00Z", reviewed: true, createdAt: new Date(),
  });
  await store.set("doctors", DOCTOR, { id: DOCTOR, verified: true });
  await store.set("consents", "consent_m6", {
    patientId: PATIENT, granteeType: "doctor", granteeId: DOCTOR,
    scope: ["records"], status: "active", grantedAt: new Date(), createdAt: new Date(),
  });

  const sessions = await Promise.all([
    createSession({ id: PATIENT, role: "patient", email: `${PATIENT}@m6.test` }),
    createSession({ id: DOCTOR, role: "doctor", email: `${DOCTOR}@m6.test` }, { mfa: true }),
    createSession({ id: STRANGER, role: "doctor", email: `${STRANGER}@m6.test` }, { mfa: true }),
    createSession({ id: ADMIN, role: "admin", email: `${ADMIN}@m6.test` }, { mfa: true }),
    createSession({ id: HOSPITAL, role: "hospital_admin", email: `${HOSPITAL}@m6.test` }, { mfa: true }),
  ]);
  [patientToken, doctorToken, strangerToken, adminToken, hospitalToken] = sessions.map((s) => s.accessToken);
});

describe("M6 clinical AI, analytics, reports and credits", () => {
  it("produces a grounded clinical summary with sources, confidence and disclaimer", async () => {
    const res = await api.get(`/api/analytics/clinical/${PATIENT}/summary`).set(bearer(patientToken)).expect(200);
    expect(res.body.text).toMatch(/not medical advice/i);
    expect(res.body.text).toContain("M6 Analytics Patient");
    expect(["High", "Moderate", "Low"]).toContain(res.body.confidence);
    expect(Array.isArray(res.body.sources)).toBe(true);
  });

  it("enforces consent on clinical summaries and analytics", async () => {
    await api.get(`/api/analytics/clinical/${PATIENT}/summary`).set(bearer(doctorToken)).expect(200);
    await api.get(`/api/analytics/clinical/${PATIENT}/summary`).set(bearer(strangerToken)).expect(403);
    await api.get(`/api/analytics/patient/${PATIENT}`).set(bearer(strangerToken)).expect(403);
  });

  it("computes patient analytics including health score and lab values", async () => {
    const res = await api.get(`/api/analytics/patient/${PATIENT}`).set(bearer(patientToken)).expect(200);
    expect(res.body.patientId).toBe(PATIENT);
    expect(res.body.recordCount).toBe(2);
    expect(res.body.indicators.hba1c.value).toBe(7.2);
    expect(res.body.indicators.hba1c.flag).toBe("high");
    expect(res.body.healthScore).toBeGreaterThanOrEqual(0);
    expect(res.body.healthScore).toBeLessThanOrEqual(100);
    expect(res.body.medications).toBeDefined();
  });

  it("exposes de-identified population analytics only to hospitals/admins", async () => {
    const res = await api.get("/api/analytics/population").set(bearer(hospitalToken)).expect(200);
    expect(res.body.totalPatients).toBeGreaterThanOrEqual(1);
    expect(res.body.patientsByCity).toBeDefined();
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain("29001010107777");
    expect(raw).not.toContain("M6 Analytics Patient");
    await api.get("/api/analytics/population").set(bearer(patientToken)).expect(403);
  });

  it("generates PDF and FHIR patient history, denying unauthorized access", async () => {
    const pdf = await api.get(`/api/reports/history?patientId=${PATIENT}&format=pdf`).set(bearer(patientToken)).expect(200);
    expect(pdf.headers["content-type"]).toContain("application/pdf");
    expect(pdf.body.slice(0, 5).toString()).toBe("%PDF-");
    const fhir = await api.get(`/api/reports/history?patientId=${PATIENT}&format=fhir`).set(bearer(doctorToken)).expect(200);
    expect(fhir.body.resourceType).toBe("Bundle");
    expect(fhir.body.entry.some((e) => e.resource.resourceType === "Patient")).toBe(true);
    expect(fhir.body.entry.some((e) => e.resource.resourceType === "Observation")).toBe(true);
    await api.get(`/api/reports/history?patientId=${PATIENT}`).set(bearer(strangerToken)).expect(403);
  });

  it("generates lab, clinical, audit and population reports in CSV/JSON", async () => {
    const labs = await api.get(`/api/reports/labs?patientId=${PATIENT}&format=csv`).set(bearer(patientToken)).expect(200);
    expect(labs.text).toContain("HbA1c");
    expect(labs.text).toContain("test,value,unit");
    const clinical = await api.get(`/api/reports/clinical-summary?patientId=${PATIENT}&format=json`).set(bearer(patientToken)).expect(200);
    expect(clinical.body.disclaimer || clinical.body.text).toBeTruthy();
    const population = await api.get("/api/reports/population?format=json").set(bearer(hospitalToken)).expect(200);
    expect(population.body.generatedAt).toBeTruthy();
    await api.get("/api/reports/audit?format=csv").set(bearer(adminToken)).expect(200);
    await api.get("/api/reports/audit?format=csv").set(bearer(patientToken)).expect(403);
  });

  it("awards contribution credits on verified uploads and exposes the balance", async () => {
    const csv = "test,value,unit\nhba1c,6.9,%";
    await api.post("/api/records/ingest").set(bearer(doctorToken))
      .field("patientId", PATIENT)
      .attach("file", Buffer.from(csv), { filename: "credits.csv", contentType: "text/csv" })
      .expect(201);
    const res = await api.get("/api/analytics/credits").set(bearer(doctorToken)).expect(200);
    expect(res.body.balance).toBeGreaterThanOrEqual(10);
  });
});
