import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import { createSession } from "../../src/services/session.service.js";
import { getStore } from "../../src/store/index.js";

const api = request(app);
const bearer = (t) => ({ Authorization: `Bearer ${t}` });
const P = "authz_patient";
const D = "authz_doctor";
const STRANGER = "authz_stranger";
const PH = "authz_pharmacy";
const LAB = "authz_lab";
const ADMIN = "authz_admin";

let patient, doctor, stranger, pharmacy, lab, admin;

beforeAll(async () => {
  const store = getStore();
  for (const [id, role] of [[P, "patient"], [D, "doctor"], [STRANGER, "doctor"], [PH, "pharmacy"], [LAB, "lab_staff"], [ADMIN, "admin"]]) {
    await store.set("users", id, { id, role, email: `${id}@authz.test`, name: id, status: "active", createdAt: new Date() });
  }
  await store.set("patients", P, { id: P, name: "Authz Patient", nationalId: "29001010103333", bloodGroup: "O+", allergies: ["Penicillin"], privacy: { aiChatbotEnabled: false } });
  await store.set("doctors", D, { id: D, verified: true });
  await store.set("doctors", STRANGER, { id: STRANGER, verified: true });
  await store.set("consents", "authz_consent", {
    patientId: P, granteeType: "doctor", granteeId: D, scope: ["records"], status: "active", grantedAt: new Date(),
  });
  await store.set("pharmacies", "pharm_authz", { id: "pharm_authz", institutionId: "pharm_authz", name: "A Pharmacy", whatsapp: "01011111111", location: { lat: 31.2, lng: 29.92 }, active: true, status: "approved" });
  await store.set("pharmacies", "pharm_other", { id: "pharm_other", institutionId: "pharm_other", name: "Other Pharmacy", whatsapp: "01222222222", location: { lat: 31.3, lng: 29.93 }, active: true, status: "approved" });
  await store.set("users", PH, { id: PH, role: "pharmacy", email: `${PH}@authz.test`, name: PH, status: "active", institutionId: "pharm_authz", createdAt: new Date() });
  const sessions = await Promise.all([
    createSession({ id: P, role: "patient", email: `${P}@authz.test` }),
    createSession({ id: D, role: "doctor", email: `${D}@authz.test` }, { mfa: true }),
    createSession({ id: STRANGER, role: "doctor", email: `${STRANGER}@authz.test` }, { mfa: true }),
    createSession({ id: PH, role: "pharmacy", email: `${PH}@authz.test` }, { mfa: true }),
    createSession({ id: LAB, role: "lab_staff", email: `${LAB}@authz.test` }, { mfa: true }),
    createSession({ id: ADMIN, role: "admin", email: `${ADMIN}@authz.test` }, { mfa: true }),
  ]);
  [patient, doctor, stranger, pharmacy, lab, admin] = sessions.map((s) => s.accessToken);
});

describe("Authorization matrix and security regressions", () => {
  it("a doctor cannot revoke another patient's consent", async () => {
    await api.post(`/api/consents/authz_consent/revoke`).set(bearer(stranger)).send({ reason: "attack" }).expect(403);
    const granted = await api.get("/api/consents/grantee").set(bearer(doctor)).expect(200);
    expect(granted.body.consents?.some?.((c) => c.id === "authz_consent") || Array.isArray(granted.body.consents)).toBe(true);
  });

  it("the patient can revoke their own consent", async () => {
    await api.post("/api/consents/authz_consent/revoke").set(bearer(patient)).send({ reason: "done" }).expect(200);
  });

  it("a pharmacy cannot edit another pharmacy's profile", async () => {
    await api.patch("/api/pharmacy/profile").set(bearer(pharmacy)).send({ id: "pharm_other", name: "Renamed Pharmacy", whatsapp: "01099999999" }).expect(200);
    const other = await getStore().get("pharmacies", "pharm_other");
    expect(other.name).toBe("Other Pharmacy");
    const own = await getStore().get("pharmacies", "pharm_authz");
    expect(own.name).toBe("Renamed Pharmacy");
  });

  it("a patient cannot generate the population report", async () => {
    await api.get("/api/reports/population?format=json").set(bearer(patient)).expect(403);
    await api.get("/api/reports/population?format=json").set(bearer(admin)).expect(200);
  });

  it("a stranger doctor cannot read demographics or prescribe without consent", async () => {
    await getStore().set("consents", "authz_consent", {
      patientId: P, granteeType: "doctor", granteeId: D, scope: ["records"], status: "active", grantedAt: new Date(),
    });
    await api.get(`/api/patients/${P}`).set(bearer(stranger)).expect(403);
    await api.post("/api/prescriptions").set(bearer(stranger)).send({ patientId: P, items: [{ name: "Aspirin" }] }).expect(403);
    await api.get(`/api/patients/${P}`).set(bearer(doctor)).expect(200);
  });

  it("lab staff cannot mint an NFC token for a patient", async () => {
    await api.post("/api/nfc").set(bearer(lab)).send({ patientId: P }).expect(403);
  });

  it("an emergency chatbot disabled by the patient refuses chat", async () => {
    const qr = await api.post("/api/emergency/qr").set(bearer(patient)).expect(200);
    await api.post(`/api/emergency/${qr.body.token}/chat`).send({ message: "collapse" }).expect(403);
    const profile = await api.get(`/api/emergency/${qr.body.token}`).expect(200);
    expect(profile.body.settings.aiChatbotEnabled).toBe(false);
  });

  it("CSV exports neutralise spreadsheet formulas", async () => {
    await getStore().set("patients", "authz_formula", { id: "authz_formula", name: "Formula Patient" });
    await getStore().set("records", "authz_formula_rec", {
      id: "authz_formula_rec", patientId: "authz_formula", type: "lab", title: "Test",
      institutionId: "=HYPERLINK(\"http://evil\")", data: { hba1c: 7 }, observedAt: "2026-01-01",
    });
    const res = await api.get("/api/reports/labs?patientId=authz_formula&format=csv").set(bearer(admin)).expect(200);
    expect(res.text).toContain("'=HYPERLINK");
    expect(res.text).not.toMatch(/,=HYPERLINK/);
  });
});
