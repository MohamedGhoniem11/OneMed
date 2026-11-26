import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import { createSession } from "../../src/services/session.service.js";
import { getStore } from "../../src/store/index.js";

const api = request(app);
const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const PATIENT = "life_patient";
const LAB = "life_lab";
const DOCTOR = "life_doctor";
const ADMIN = "life_admin";
const OUTSIDER = "life_outside";
const PHARM = "life_pharm_user";

let patientToken, labToken, doctorToken, adminToken, outsideToken, pharmToken;
const fresh = async (user, opts) => (await createSession(user, opts)).accessToken;

beforeAll(async () => {
  const store = getStore();
  for (const user of [
    { id: PATIENT, role: "patient", email: "life-patient@test.local", name: "Life Patient" },
    { id: LAB, role: "lab_staff", email: "life-lab@test.local", name: "Life Lab", institutionId: "inst_lab" },
    { id: DOCTOR, role: "doctor", email: "life-doctor@test.local", name: "Life Doctor" },
    { id: ADMIN, role: "admin", email: "life-admin@test.local", name: "Life Admin" },
    { id: OUTSIDER, role: "patient", email: "life-outside@test.local", name: "Outsider" },
    { id: PHARM, role: "pharmacy", email: "life-pharm@test.local", name: "Life Pharmacy", institutionId: "pharm_life" },
  ]) {
    await store.set("users", user.id, { ...user, status: "active", createdAt: new Date() });
  }
  await store.set("institutions", "inst_lab", {
    id: "inst_lab", name: "Life Lab", type: "laboratory", active: true, verified: true,
    licenseNumber: "LIFE-1", city: "Alexandria",
  });
  await store.set("pharmacies", "pharm_life", {
    id: "pharm_life", institutionId: "pharm_life", name: "Life Pharmacy", status: "approved", active: true,
  });
  await store.set("consents", "life_consent_lab", {
    patientId: PATIENT, granteeType: "institution", granteeId: "inst_lab",
    scope: ["records"], status: "active", grantedAt: new Date(),
  });
  await store.set("consents", "life_consent_doctor", {
    patientId: PATIENT, granteeType: "doctor", granteeId: DOCTOR,
    scope: ["records"], status: "active", grantedAt: new Date(),
  });

  [
    patientToken, labToken, doctorToken, adminToken, outsideToken, pharmToken,
  ] = await Promise.all([
    fresh({ id: PATIENT, role: "patient", email: "life-patient@test.local" }),
    fresh({ id: LAB, role: "lab_staff", email: "life-lab@test.local" }, { mfa: true }),
    fresh({ id: DOCTOR, role: "doctor", email: "life-doctor@test.local" }, { mfa: true }),
    fresh({ id: ADMIN, role: "admin", email: "life-admin@test.local" }, { mfa: true }),
    fresh({ id: OUTSIDER, role: "patient", email: "life-outside@test.local" }),
    fresh({ id: PHARM, role: "pharmacy", email: "life-pharm@test.local" }, { mfa: true }),
  ]);
});

describe("lifecycle and removal safety", () => {
  it("archives for authorized staff only; clinicians retain and can restore archived records", async () => {
    const store = getStore();
    await store.set("records", "life_record", {
      id: "life_record", patientId: PATIENT, type: "lab", title: "Panel", status: "normal",
      lifecycle: "accessible", observedAt: new Date(), createdAt: new Date(),
    });
    await api.post("/api/records/life_record/archive").set(bearer(patientToken)).expect(403);
    await api.post("/api/records/life_record/archive").set(bearer(labToken)).expect(200);
    const active = await api.get(`/api/records?patientId=${PATIENT}`).set(bearer(doctorToken)).expect(200);
    expect(active.body.items.some((r) => r.id === "life_record")).toBe(false);
    const archived = await api.get(`/api/records?patientId=${PATIENT}&lifecycle=archived`).set(bearer(doctorToken)).expect(200);
    expect(archived.body.items.some((r) => r.id === "life_record")).toBe(true);
    await api.get("/api/records/life_record").set(bearer(doctorToken)).expect(200);
    await api.post("/api/records/life_record/restore").set(bearer(labToken)).expect(200);
    const restored = await api.get(`/api/records?patientId=${PATIENT}`).set(bearer(doctorToken)).expect(200);
    expect(restored.body.items.some((r) => r.id === "life_record")).toBe(true);
    const { items } = await store.query("accessLog", { limit: 500 });
    expect(items.some((a) => a.action === "record_archived")).toBe(true);
    expect(items.some((a) => a.action === "record_restored")).toBe(true);
  });

  it("hides a conversation only for the requesting participant", async () => {
    const store = getStore();
    await store.set("conversations", "life_conv", {
      id: "life_conv", patientId: PATIENT, otherUserId: DOCTOR, otherName: "Life Doctor",
      role: "doctor", updatedAt: new Date(),
    });
    await store.set("messages", "life_msg", {
      id: "life_msg", conversationId: "life_conv", senderId: DOCTOR, text: "Hello", sentAt: new Date(),
    });
    await api.patch("/api/messages/conversations/life_conv/hide").set(bearer(outsideToken)).expect(403);
    await api.patch("/api/messages/conversations/life_conv/hide").set(bearer(patientToken)).expect(200);
    const mine = await api.get("/api/messages/conversations").set(bearer(patientToken)).expect(200);
    expect(mine.body.conversations.some((c) => c.id === "life_conv")).toBe(false);
    const theirs = await api.get("/api/messages/conversations").set(bearer(doctorToken)).expect(200);
    expect(theirs.body.conversations.some((c) => c.id === "life_conv")).toBe(true);
    await api.get("/api/messages/conversations/life_conv/messages").set(bearer(patientToken)).expect(404);
    await api.get("/api/messages/conversations/life_conv/messages").set(bearer(doctorToken)).expect(200);
    expect(await store.get("messages", "life_msg")).not.toBeNull();
    const { items } = await store.query("accessLog", { limit: 500 });
    expect(items.some((a) => a.action === "conversation_hidden")).toBe(true);
  });

  it("deactivates users, revokes sessions, and refuses hard delete without an erasure request", async () => {
    const store = getStore();
    await api.patch(`/api/users/${ADMIN}/status`).set(bearer(adminToken)).send({ status: "inactive" }).expect(400);
    await api.delete(`/api/users/${LAB}`).set(bearer(adminToken)).expect(409);
    const res = await api.patch(`/api/users/${LAB}/status`).set(bearer(adminToken)).send({ status: "inactive" }).expect(200);
    expect(res.body.status).toBe("inactive");
    await api.get("/api/records").set(bearer(labToken)).expect(401);
    await api.patch(`/api/users/${LAB}/status`).set(bearer(adminToken)).send({ status: "active" }).expect(200);
    const freshLab = await fresh({ id: LAB, role: "lab_staff", email: "life-lab@test.local" }, { mfa: true });
    await api.get("/api/records").set(bearer(freshLab)).expect(200);
    const { items } = await store.query("accessLog", { limit: 500 });
    expect(items.some((a) => a.action === "user_deactivated")).toBe(true);
  });

  it("deactivating an institution blocks its staff until reactivation", async () => {
    const store = getStore();
    const lab = await fresh({ id: LAB, role: "lab_staff", email: "life-lab@test.local" }, { mfa: true });
    await api.patch("/api/institutions/inst_lab/active").set(bearer(lab)).send({ active: false }).expect(403);
    await api.patch("/api/institutions/inst_lab/active").set(bearer(adminToken)).send({ active: false }).expect(200);
    await api.get("/api/records").set(bearer(lab)).expect(401);
    await api.patch("/api/institutions/inst_lab/active").set(bearer(adminToken)).send({ active: true }).expect(200);
    await api.get("/api/records").set(bearer(lab)).expect(401); // sessions were revoked
    const freshLab = await fresh({ id: LAB, role: "lab_staff", email: "life-lab@test.local" }, { mfa: true });
    await api.get("/api/records").set(bearer(freshLab)).expect(200);
    expect((await store.get("institutions", "inst_lab")).active).toBe(true);
  });

  it("suspending a pharmacy blocks its staff until it is approved again", async () => {
    await api.patch("/api/admin/pharmacies/pharm_life/status").set(bearer(patientToken)).send({ status: "suspended" }).expect(403);
    await api.patch("/api/admin/pharmacies/pharm_life/status").set(bearer(adminToken)).send({ status: "suspended" }).expect(200);
    await api.get("/api/pharmacy/profile").set(bearer(pharmToken)).expect(401);
    await api.patch("/api/admin/pharmacies/pharm_life/status").set(bearer(adminToken)).send({ status: "approved" }).expect(200);
    const freshPharm = await fresh({ id: PHARM, role: "pharmacy", email: "life-pharm@test.local" }, { mfa: true });
    await api.get("/api/pharmacy/profile").set(bearer(freshPharm)).expect(200);
  });

  it("audits notification removal", async () => {
    const store = getStore();
    await store.set("notifications", "life_note", {
      id: "life_note", userId: PATIENT, title: "Result", body: "Ready", read: false, createdAt: new Date(),
    });
    await api.delete("/api/notifications/life_note").set(bearer(outsideToken)).expect(404);
    await api.delete("/api/notifications/life_note").set(bearer(patientToken)).expect(200);
    const { items } = await store.query("accessLog", { limit: 500 });
    expect(items.some((a) => a.action === "notification_removed")).toBe(true);
  });
});
