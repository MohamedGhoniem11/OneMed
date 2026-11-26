import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import { createSession } from "../../src/services/session.service.js";
import { getStore } from "../../src/store/index.js";

const api = request(app);
const bearer = (t) => ({ Authorization: `Bearer ${t}` });
const P = "chat_patient";
const D = "chat_doctor";
const X = "chat_stranger";

let doctor, stranger, patient;

beforeAll(async () => {
  const store = getStore();
  await store.set("users", P, { id: P, role: "patient", email: "p@chat.test", status: "active" });
  await store.set("users", D, { id: D, role: "doctor", email: "d@chat.test", status: "active" });
  await store.set("users", X, { id: X, role: "doctor", email: "x@chat.test", status: "active" });
  await store.set("patients", P, {
    id: P, name: "Chat Patient", bloodGroup: "A+", allergies: ["Latex"],
    chronicDiseases: ["Asthma"], activeMedications: ["Salbutamol"],
  });
  await store.set("doctors", D, { id: D, verified: true });
  await store.set("doctors", X, { id: X, verified: true });
  await store.set("records", "chat_rec", {
    id: "chat_rec", patientId: P, type: "lab", title: "Panel",
    data: { hba1c: 8.1 }, observedAt: "2026-03-01", createdAt: new Date(),
  });
  await store.set("consents", "chat_consent", {
    patientId: P, granteeType: "doctor", granteeId: D, scope: ["records"], status: "active", grantedAt: new Date(),
  });
  await store.set("guidelineChunks", "chat_kb", {
    id: "chat_kb", source: "WHO Basic Emergency Care (paraphrased)", section: "Breathing difficulty",
    language: "en", text: "Sit the person upright, loosen tight clothing and call emergency services if breathing worsens.",
    tags: ["breathing", "asthma"], embedding: new Array(64).fill(0).map((_, i) => i % 3 ? 0.01 : -0.01), version: "2024",
  });
  [doctor, stranger, patient] = (await Promise.all([
    createSession({ id: D, role: "doctor", email: "d@chat.test" }, { mfa: true }),
    createSession({ id: X, role: "doctor", email: "x@chat.test" }, { mfa: true }),
    createSession({ id: P, role: "patient", email: "p@chat.test" }),
  ])).map((s) => s.accessToken);
});

describe("Doctor-facing patient-scoped RAG assistant", () => {
  it("answers with patient context, confidence, sources and a disclaimer", async () => {
    const res = await api.post(`/api/analytics/clinical/${P}/chat`)
      .set(bearer(doctor)).send({ message: "asthma breathing difficulty", language: "en" }).expect(200);
    expect(res.body.role).toBe("assistant");
    expect(["High", "Moderate", "Low", "Knowledge Gap"]).toContain(res.body.confidence);
    expect(res.body.disclaimer).toMatch(/responsible for clinical decisions/i);
    expect(res.body.text).toContain("Chat Patient");
    expect(Array.isArray(res.body.sources)).toBe(true);
  });

  it("refuses a stranger without consent", async () => {
    await api.post(`/api/analytics/clinical/${P}/chat`)
      .set(bearer(stranger)).send({ message: "summarise the patient" }).expect(403);
  });

  it("denies the doctor assistant to patients", async () => {
    await api.post(`/api/analytics/clinical/${P}/chat`)
      .set(bearer(patient)).send({ message: "summarise my lab results" }).expect(403);
  });

  it("bounds diagnosis requests and politely declines unrelated questions", async () => {
    const rx = await api.post(`/api/analytics/clinical/${P}/chat`)
      .set(bearer(doctor)).send({ message: "Diagnose the patient and prescribe drug doses", language: "en" }).expect(200);
    expect(rx.body.scope).toBe("bounded");
    expect(rx.body.text).toContain("I do not diagnose or prescribe");
    const weather = await api.post(`/api/analytics/clinical/${P}/chat`)
      .set(bearer(doctor)).send({ message: "What is the weather in Cairo tomorrow?", language: "en" }).expect(200);
    expect(weather.body.scope).toBe("out_of_scope");
    expect(weather.body.text).toContain("recorded information");
  });

  it("never refuses a possible emergency and answers Arabic in Arabic", async () => {
    const em = await api.post(`/api/analytics/clinical/${P}/chat`)
      .set(bearer(doctor)).send({ message: "The patient is not breathing, help!", language: "en" }).expect(200);
    expect(em.body.scope).toBe("emergency");
    expect(em.body.text).toContain("123");
    const ar = await api.post(`/api/analytics/clinical/${P}/chat`)
      .set(bearer(doctor)).send({ message: "لخّص نتائج التحاليل المسجلة", language: "ar" }).expect(200);
    expect(["record_query", "unclear"]).toContain(ar.body.scope);
    expect(ar.body.disclaimer).toContain("responsible for clinical decisions");
  });

  it("rejects empty messages and audits every query", async () => {
    await api.post(`/api/analytics/clinical/${P}/chat`).set(bearer(doctor)).send({ message: "" }).expect(400);
    const { items } = await getStore().query("accessLog", {
      where: [{ field: "action", op: "==", value: "doctor_ai_query" }], limit: 50,
    });
    expect(items.length).toBeGreaterThan(0);
  });
});
