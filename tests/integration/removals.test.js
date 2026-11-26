import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import { createSession } from "../../src/services/session.service.js";
import { getStore } from "../../src/store/index.js";

const api = request(app);
const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const PATIENT = "remove_patient";
const LAB = "remove_lab";
const DOCTOR = "remove_doctor";
const ADMIN = "remove_admin";
const OUTSIDER = "remove_outside";

let patientToken, labToken, doctorToken, adminToken, outsideToken;

beforeAll(async () => {
  const store = getStore();
  for (const user of [
    { id: PATIENT, role: "patient", email: "remove-patient@test.local", name: "Remove Patient" },
    { id: LAB, role: "lab_staff", email: "remove-lab@test.local", name: "Remove Lab", institutionId: "inst_lab" },
    { id: DOCTOR, role: "doctor", email: "remove-doctor@test.local", name: "Remove Doctor" },
    { id: ADMIN, role: "admin", email: "remove-admin@test.local", name: "Remove Admin" },
    { id: OUTSIDER, role: "patient", email: "remove-outside@test.local", name: "Outsider" },
  ]) {
    await store.set("users", user.id, { ...user, status: "active", createdAt: new Date() });
  }
  await store.set("doctors", DOCTOR, { id: DOCTOR, verified: true });
  await store.set("consents", "remove_consent_lab", {
    patientId: PATIENT, granteeType: "institution", granteeId: "inst_lab",
    scope: ["records"], status: "active", grantedAt: new Date(),
  });
  const tokens = await Promise.all([
    createSession({ id: PATIENT, role: "patient", email: "remove-patient@test.local" }),
    createSession({ id: LAB, role: "lab_staff", email: "remove-lab@test.local" }, { mfa: true }),
    createSession({ id: DOCTOR, role: "doctor", email: "remove-doctor@test.local" }, { mfa: true }),
    createSession({ id: ADMIN, role: "admin", email: "remove-admin@test.local" }, { mfa: true }),
    createSession({ id: OUTSIDER, role: "patient", email: "remove-outside@test.local" }),
  ]);
  [patientToken, labToken, doctorToken, adminToken, outsideToken] = tokens.map((s) => s.accessToken);
});

describe("remove actions", () => {
  it("soft-deletes a record for the patient owner and hides it from reads and queues", async () => {
    const store = getStore();
    await store.set("records", "remove_record_1", {
      id: "remove_record_1", patientId: PATIENT, type: "lab", title: "Panel",
      status: "needs_review", lifecycle: "accessible", observedAt: new Date(), createdAt: new Date(),
    });
    const res = await api.delete("/api/records/remove_record_1").set(bearer(patientToken)).expect(200);
    expect(res.body.ok).toBe(true);
    await api.get("/api/records/remove_record_1").set(bearer(patientToken)).expect(404);
    const pending = await api.get("/api/records/pending").set(bearer(labToken)).expect(200);
    expect(pending.body.items.some((r) => r.id === "remove_record_1")).toBe(false);
    const record = await store.get("records", "remove_record_1");
    expect(record.lifecycle).toBe("deleted");
  });

  it("lets a consented lab remove a record but refuses an unrelated patient", async () => {
    const store = getStore();
    await store.set("records", "remove_record_2", {
      id: "remove_record_2", patientId: PATIENT, type: "lab", title: "Panel",
      status: "normal", lifecycle: "accessible", observedAt: new Date(), createdAt: new Date(),
    });
    await api.delete("/api/records/remove_record_2").set(bearer(labToken)).expect(200);
    await api.delete("/api/records/remove_record_2").set(bearer(outsideToken)).expect(404);
  });

  it("removes only the owner's notifications", async () => {
    const store = getStore();
    await store.set("notifications", "remove_note", {
      id: "remove_note", userId: PATIENT, title: "Result", body: "Ready", read: false, createdAt: new Date(),
    });
    await api.delete("/api/notifications/remove_note").set(bearer(outsideToken)).expect(404);
    await api.delete("/api/notifications/remove_note").set(bearer(patientToken)).expect(200);
    expect(await store.get("notifications", "remove_note")).toBeNull();
  });

  it("removes a conversation and its messages for a participant", async () => {
    const store = getStore();
    await store.set("conversations", "remove_conv", {
      id: "remove_conv", patientId: PATIENT, otherUserId: DOCTOR, otherName: "Dr. Remove",
      role: "doctor", updatedAt: new Date(),
    });
    await store.set("messages", "remove_msg", {
      id: "remove_msg", conversationId: "remove_conv", senderId: DOCTOR, text: "Hello", sentAt: new Date(),
    });
    await api.delete("/api/messages/conversations/remove_conv").set(bearer(outsideToken)).expect(403);
    await api.delete("/api/messages/conversations/remove_conv").set(bearer(patientToken)).expect(200);
    expect(await store.get("conversations", "remove_conv")).toBeNull();
    expect(await store.get("messages", "remove_msg")).toBeNull();
  });

  it("discards only unconfirmed prescription drafts", async () => {
    const store = getStore();
    await store.set("prescriptions", "remove_rx_draft", {
      id: "remove_rx_draft", doctorId: DOCTOR, patientId: PATIENT, status: "pending",
      extractionStatus: "extracted", items: [], createdAt: new Date(),
    });
    await store.set("prescriptions", "remove_rx_done", {
      id: "remove_rx_done", doctorId: DOCTOR, patientId: PATIENT, status: "confirmed",
      extractionStatus: "confirmed", items: [], createdAt: new Date(),
    });
    const res = await api.delete("/api/prescriptions/remove_rx_draft").set(bearer(doctorToken)).expect(200);
    expect(res.body.status).toBe("cancelled");
    await api.delete("/api/prescriptions/remove_rx_done").set(bearer(doctorToken)).expect(409);
  });

  it("deactivates institutions and suspends pharmacies as admin only", async () => {
    const store = getStore();
    await store.set("institutions", "remove_inst", {
      id: "remove_inst", name: "Remove Clinic", type: "clinic", active: true, verified: true,
      licenseNumber: "RM-1", city: "Alexandria",
    });
    await store.set("pharmacies", "remove_pharm", {
      id: "remove_pharm", name: "Remove Pharmacy", status: "approved", active: true,
    });
    await api.patch("/api/institutions/remove_inst/active").set(bearer(labToken)).send({ active: false }).expect(403);
    const inst = await api.patch("/api/institutions/remove_inst/active").set(bearer(adminToken)).send({ active: false }).expect(200);
    expect(inst.body.active).toBe(false);
    await api.patch("/api/admin/pharmacies/remove_pharm/status").set(bearer(patientToken)).send({ status: "suspended" }).expect(403);
    const pharm = await api.patch("/api/admin/pharmacies/remove_pharm/status").set(bearer(adminToken)).send({ status: "suspended" }).expect(200);
    expect(pharm.body.status).toBe("suspended");
    expect(pharm.body.active).toBe(false);
  });
});
