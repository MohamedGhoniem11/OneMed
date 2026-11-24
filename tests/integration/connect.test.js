import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import { createSession } from "../../src/services/session.service.js";
import { getStore } from "../../src/store/index.js";
import { revokeNfc } from "../../src/services/token.service.js";

const api = request(app);
const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const P1 = "user_patient_1";
const P2 = "user_patient_2";
const DOC = "user_doctor_1";
const LAB = "user_lab_staff";
const ADMIN = "user_admin";

let doctorToken, patientToken, patient2Token, labToken, adminToken;

beforeAll(async () => {
  const store = getStore();
  const users = [
    { id: P1, role: "patient", email: "p1@connect.test", name: "Mona Hassan" },
    { id: P2, role: "patient", email: "p2@connect.test", name: "Youssef Adel" },
    { id: DOC, role: "doctor", email: "doc@connect.test", name: "Dr. Karim Hassan" },
    { id: LAB, role: "lab_staff", email: "lab@connect.test", name: "Nadia Lab" },
    { id: ADMIN, role: "admin", email: "admin@connect.test", name: "System Admin" },
  ];
  for (const user of users) await store.set("users", user.id, { ...user, status: "active", createdAt: new Date() });
  for (const [id, blood, allergies] of [[P1, "O+", ["Penicillin"]], [P2, "A+", []]]) {
    await store.set("patients", id, {
      id, userId: id, name: users.find((u) => u.id === id).name, nationalId: id === P1 ? "29001010101234" : "29001010109999",
      phone: id === P1 ? "01012345678" : "01122334455", bloodGroup: blood, allergies, chronicDiseases: ["Diabetes"], createdAt: new Date(),
    });
  }
  await store.set("doctors", DOC, { id: DOC, institutionId: "inst_main", verified: true });
  await store.set("doctors", LAB, { id: LAB, institutionId: "inst_lab", verified: true });
  await store.set("consents", "c1", {
    patientId: P1, granteeType: "doctor", granteeId: DOC, scope: ["records", "prescriptions"],
    status: "active", grantedAt: new Date(),
  });
  await store.set("consents", "c2", {
    patientId: P1, granteeType: "institution", granteeId: "inst_lab",
    scope: ["records"], status: "active", grantedAt: new Date(),
  });
  const sessions = await Promise.all([
    createSession({ id: DOC, role: "doctor", email: "doc@connect.test" }, { mfa: true }),
    createSession({ id: P1, role: "patient", email: "p1@connect.test" }),
    createSession({ id: P2, role: "patient", email: "p2@connect.test" }),
    createSession({ id: LAB, role: "lab_staff", email: "lab@connect.test" }, { mfa: true }),
    createSession({ id: ADMIN, role: "admin", email: "admin@connect.test" }, { mfa: true }),
  ]);
  [doctorToken, patientToken, patient2Token, labToken, adminToken] = sessions.map((s) => s.accessToken);
});

describe("M3 connection QR, NFC and clinical access", () => {
  it("creates a 15-minute QR connection and grants consent on patient acceptance", async () => {
    const created = await api
      .post("/api/connect/qr")
      .set(bearer(doctorToken))
      .send({ patientId: P1, scope: ["records"], purpose: "Follow-up visit" })
      .expect(201);
    expect(created.body.scope).toEqual(["records"]);
    expect(created.body.url).toContain("/qr/");

    const resolved = await api.get(`/api/connect/${created.body.token}`).expect(200);
    expect(resolved.body.doctorName).toBe("Dr. Karim Hassan");
    expect(resolved.body.patientId).toBeUndefined();
    expect(new Date(resolved.body.expiresAt).getTime() - Date.now()).toBeLessThanOrEqual(900_000);

    const accepted = await api.post(`/api/connect/${created.body.token}/accept`).set(bearer(patientToken)).expect(201);
    expect(accepted.body.consent.granteeId).toBe(DOC);
    expect(accepted.body.consent.scope).toEqual(["records"]);

    const audit = await api.get("/api/audit").set(bearer(adminToken)).expect(200);
    expect(audit.body.auditLog.some((entry) => entry.action === "connection_qr_created")).toBe(true);
    expect(audit.body.auditLog.some((entry) => entry.action === "consent_granted" && entry.metadata?.source === "connection_qr")).toBe(true);
  });

  it("rejects acceptance by a different patient", async () => {
    const created = await api
      .post("/api/connect/qr")
      .set(bearer(doctorToken))
      .send({ patientId: P1, scope: ["records"], purpose: "Another visit" })
      .expect(201);
    await api.post(`/api/connect/${created.body.token}/accept`).set(bearer(patient2Token)).expect(403);
  });

  it("issues and resolves an NFC token without exposing raw tokens at rest", async () => {
    const issued = await api
      .post("/api/nfc")
      .set(bearer(labToken))
      .send({ patientId: P1, nfcUid: "NTAG424-TEST" })
      .expect(201);
    expect(issued.body.token.split(".")).toHaveLength(3);
    expect(issued.body.url).toContain("/nfc/");

    const resolved = await api.get(`/api/nfc/${issued.body.token}`).expect(200);
    expect(resolved.body.patientId).toBe(P1);

    const mine = await api.get("/api/nfc/mine").set(bearer(patientToken)).expect(200);
    expect(mine.body).toMatchObject({ issued: true, nfcUid: "NTAG424-TEST" });
    expect(mine.body.token).toBeUndefined();

    const stored = await getStore().query("nfcTokens", { where: [{ field: "patientId", op: "==", value: P1 }] });
    expect(stored.items[0].tokenHash).not.toBe(issued.body.token);
    await revokeNfc(stored.items[0].id);
    await api.get(`/api/nfc/${issued.body.token}`).expect(403);
  });

  it("searches only patients the requester may access", async () => {
    const allowed = await api.get("/api/patients/search?q=Mona").set(bearer(doctorToken)).expect(200);
    expect(allowed.body.patients.map((p) => p.id)).toContain(P1);
    const denied = await api.get("/api/patients/search?q=Youssef").set(bearer(doctorToken)).expect(200);
    expect(denied.body.patients.map((p) => p.id)).not.toContain(P2);
  });

  it("requires a justification for emergency override and logs it", async () => {
    await api.post(`/api/patients/${P1}/emergency-override`).set(bearer(doctorToken))
      .send({ reason: "short" }).expect(400);
    const result = await api.post(`/api/patients/${P1}/emergency-override`).set(bearer(doctorToken))
      .send({ reason: "Unconscious patient, need allergy status immediately" }).expect(200);
    expect(result.body.critical.bloodGroup).toBe("O+");
    expect(result.body.critical.allergies).toContain("Penicillin");
    await api.post(`/api/patients/${P1}/emergency-override`).set(bearer(labToken))
      .send({ reason: "Unconscious patient, need allergy status immediately" }).expect(403);

    const audit = await api.get("/api/audit").set(bearer(adminToken)).expect(200);
    expect(audit.body.auditLog.some((entry) => entry.action === "emergency_override")).toBe(true);
  });
});
