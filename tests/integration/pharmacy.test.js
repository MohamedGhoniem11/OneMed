import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import { createSession } from "../../src/services/session.service.js";
import { getStore } from "../../src/store/index.js";

const api = request(app);
const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const PATIENT = "user_pharmacy_patient";
const DOCTOR = "user_pharmacy_doctor";
const PHARMACY = "user_pharmacy_partner";

let patientToken, doctorToken, pharmacyToken;

beforeAll(async () => {
  const store = getStore();
  await store.set("users", PATIENT, { id: PATIENT, role: "patient", email: "p@pharmacy.test", name: "Pharmacy Patient", status: "active", createdAt: new Date() });
  await store.set("users", DOCTOR, { id: DOCTOR, role: "doctor", email: "d@pharmacy.test", name: "Dr. Pharmacy", status: "active", createdAt: new Date() });
  await store.set("users", PHARMACY, { id: PHARMACY, role: "pharmacy", email: "rx@pharmacy.test", name: "Pharmacy Desk", status: "active", institutionId: "pharm_near", createdAt: new Date() });
  await store.set("patients", PATIENT, {
    id: PATIENT, userId: PATIENT, name: "Pharmacy Patient", nationalId: "29001010104444",
    dateOfBirth: "1990-01-01", gender: "female", bloodGroup: "O+", location: { lat: 31.2, lng: 29.92 }, createdAt: new Date(),
  });
  await store.set("pharmacies", "pharm_near", {
    id: "pharm_near", institutionId: "pharm_near", name: "Near Pharmacy", address: "Near street", city: "Alexandria",
    phone: "01011111111", whatsapp: "01011111111", location: { lat: 31.201, lng: 29.921 },
    hours: "Open 24/7", rating: 4.7, active: true, status: "approved", verified: true, createdAt: new Date(),
  });
  await store.set("doctors", DOCTOR, { id: DOCTOR, verified: true });
  await store.set("consents", "consent_pharmacy", {
    patientId: PATIENT, granteeType: "doctor", granteeId: DOCTOR,
    scope: ["records", "prescriptions"], status: "active", grantedAt: new Date(), createdAt: new Date(),
  });
  await store.set("pharmacies", "pharm_far", {
    id: "pharm_far", institutionId: "pharm_far", name: "Far Pharmacy", address: "Far street", city: "Cairo",
    phone: "01222222222", whatsapp: "01222222222", location: { lat: 30.04, lng: 31.24 },
    hours: "08:00 - 22:00", rating: 4.2, active: true, status: "approved", verified: true, createdAt: new Date(),
  });
  const [p, d, ph] = await Promise.all([
    createSession({ id: PATIENT, role: "patient", email: "p@pharmacy.test" }),
    createSession({ id: DOCTOR, role: "doctor", email: "d@pharmacy.test" }, { mfa: true }),
    createSession({ id: PHARMACY, role: "pharmacy", email: "rx@pharmacy.test" }, { mfa: true }),
  ]);
  patientToken = p.accessToken; doctorToken = d.accessToken; pharmacyToken = ph.accessToken;
});

describe("M5 prescription fulfillment and pharmacy workflow", () => {
  it("requires doctor confirmation before generating a 24h fulfillment link", async () => {
    const created = await api.post("/api/prescriptions").set(bearer(doctorToken)).send({
      patientId: PATIENT,
      diagnosis: "Follow-up",
      items: [{ name: "Metformin", dose: "500mg", frequency: "BID", duration: "30 days" }],
    }).expect(201);
    expect(created.body.status).toBe("pending");
    expect(created.body.linkToken).toBeUndefined();

    const confirmed = await api.post(`/api/prescriptions/${created.body.id}/confirm`).set(bearer(doctorToken)).send({
      confirmed: true,
      items: [{ name: "Metformin", dosage: "500mg", frequency: "BID", duration: "30 days" }],
    }).expect(200);
    expect(confirmed.body.status).toBe("confirmed");
    expect(confirmed.body.extractionStatus).toBe("confirmed");
    expect(confirmed.body.linkToken).toBeTruthy();
    const hours = (new Date(confirmed.body.linkExpiresAt) - Date.now()) / 3600000;
    expect(hours).toBeGreaterThan(23);
    expect(hours).toBeLessThanOrEqual(24);
  });

  it("exposes a public fulfillment page with GPS-sorted pharmacies", async () => {
    const created = await api.post("/api/prescriptions").set(bearer(doctorToken)).send({
      patientId: PATIENT,
      items: [{ name: "Aspirin", dose: "100mg" }],
    }).expect(201);
    const confirmed = await api.post(`/api/prescriptions/${created.body.id}/confirm`).set(bearer(doctorToken))
      .send({ confirmed: true, items: [{ name: "Aspirin", dosage: "100mg" }] }).expect(200);

    const page = await api.get(`/api/fulfillment/${confirmed.body.linkToken}`).expect(200);
    expect(page.body.prescription.patientName).toBe("Pharmacy Patient");
    expect(page.body.pharmacies[0].name).toBe("Near Pharmacy");
    expect(page.body.pharmacies[0].distanceKm).toBeLessThan(page.body.pharmacies[1].distanceKm);
  });

  it("selects a pharmacy, builds a WhatsApp link and advances the order", async () => {
    const created = await api.post("/api/prescriptions").set(bearer(doctorToken)).send({
      patientId: PATIENT,
      items: [{ name: "Amoxicillin", dose: "500mg", frequency: "BID", duration: "5 days" }],
    }).expect(201);
    const confirmed = await api.post(`/api/prescriptions/${created.body.id}/confirm`).set(bearer(doctorToken))
      .send({ confirmed: true, items: [{ name: "Amoxicillin", dosage: "500mg", frequency: "BID", duration: "5 days" }] }).expect(200);

    const selected = await api.post(`/api/fulfillment/${confirmed.body.linkToken}/select`).send({ pharmacyId: "pharm_near" }).expect(200);
    expect(selected.body.whatsappUrl).toContain("https://wa.me/201011111111");
    expect(decodeURIComponent(selected.body.whatsappUrl)).toContain("Amoxicillin");
    expect(selected.body.prescription.orderStatus).toBe("received");
    const audit = await getStore().query("accessLog", { limit: 500 });
    expect(audit.items.some((entry) => JSON.stringify(entry.metadata || {}).includes(confirmed.body.linkToken))).toBe(false);

    const orders = await api.get("/api/pharmacy/orders").set(bearer(pharmacyToken)).expect(200);
    expect(orders.body.orders.some((o) => o.id === created.body.id)).toBe(true);

    const advanced = await api.patch(`/api/pharmacy/orders/${created.body.id}/status`).set(bearer(pharmacyToken)).expect(200);
    expect(advanced.body.orderStatus).toBe("verifying");

    const notes = await api.get("/api/notifications").set(bearer(patientToken)).expect(200);
    expect(notes.body.items.some((n) => n.type === "order")).toBe(true);
  });

  it("supports patient-doctor conversations and messages", async () => {
    const conversation = await api.post("/api/messages/conversations").set(bearer(patientToken)).send({
      patientId: PATIENT, otherUserId: DOCTOR, otherName: "Dr. Pharmacy", role: "doctor",
    }).expect(201);
    await api.post(`/api/messages/conversations/${conversation.body.id}/messages`).set(bearer(patientToken))
      .send({ text: "Hello doctor, I have a question about my prescription" }).expect(201);
    const messages = await api.get(`/api/messages/conversations/${conversation.body.id}/messages`).set(bearer(doctorToken)).expect(200);
    expect(messages.body.messages.some((m) => m.text.includes("Hello doctor"))).toBe(true);
    const notes = await api.get("/api/notifications").set(bearer(doctorToken)).expect(200);
    expect(notes.body.items.some((n) => n.type === "message")).toBe(true);
  });

  it("enforces RBAC on pharmacy order endpoints", async () => {
    await api.get("/api/pharmacy/orders").set(bearer(patientToken)).expect(403);
    await api.get("/api/pharmacy/orders").expect(401);
    await api.get("/api/messages/conversations").expect(401);
  });
});
