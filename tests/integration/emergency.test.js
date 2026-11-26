import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import { createSession } from "../../src/services/session.service.js";
import { getStore } from "../../src/store/index.js";
import { createEmergency } from "../../src/services/token.service.js";
import { embed, llmMode } from "../../src/services/llm.service.js";
import { GUIDELINES } from "../../src/data/guidelines.js";

const api = request(app);
const P1 = "user_emergency_patient";
let patientToken;
let emergencyToken;

beforeAll(async () => {
  const store = getStore();
  await store.set("users", P1, {
    id: P1, role: "patient", email: "emergency@test.example", name: "Emergency Patient", status: "active", createdAt: new Date(),
  });
  await store.set("patients", P1, {
    id: P1, userId: P1, name: "Emergency Patient", nationalId: "29001010103333",
    dateOfBirth: "1988-01-01", gender: "female", bloodGroup: "A-",
    allergies: ["Latex"], chronicDiseases: ["Asthma"], activeMedications: ["Salbutamol"],
    emergencyContacts: [{ name: "Kin", relationship: "Sister", phone: "01099998888" }],
    privacy: { showBloodGroup: true, showAllergies: true, showChronicConditions: true, showMedications: false, showEmergencyContacts: true, aiChatbotEnabled: true },
    createdAt: new Date(),
  });
  const vectors = await embed(GUIDELINES.map((g) => `${g.text} ${g.tags.join(" ")} ${g.section}`));
  for (let i = 0; i < GUIDELINES.length; i += 1) {
    await store.set("guidelineChunks", GUIDELINES[i].id, {
      ...GUIDELINES[i], embedding: vectors[i], embeddingModel: llmMode() === "gemini" ? process.env.GEMINI_EMBEDDING_MODEL : "offline-256", updatedAt: new Date(),
    });
  }
  const session = await createSession({ id: P1, role: "patient", email: "emergency@test.example" });
  patientToken = session.accessToken;
  emergencyToken = (await createEmergency({ patientId: P1, issuedBy: P1 })).token;
});

describe("M4 emergency public page and first-aid chatbot", () => {
  it("issues an emergency QR and exposes only approved fields", async () => {
    const issued = await api.post("/api/emergency/qr").set("Authorization", `Bearer ${patientToken}`).expect(200);
    expect(issued.body.token.startsWith("om_")).toBe(true);
    expect(issued.body.token).not.toContain("user_");

    const res = await api.get(`/api/emergency/${emergencyToken}`).expect(200);
    expect(res.body.visible.patientName).toBe("Emergency Patient");
    expect(res.body.visible.bloodGroup).toBe("A-");
    expect(res.body.visible.allergies).toContain("Latex");
    expect(res.body.visible.medications).toBeUndefined();
    expect(res.body.visible.emergencyContacts).toHaveLength(1);
    expect(res.body.visible.nationalId).toBeUndefined();
  });

  it("updates privacy and hides revoked fields on the public page", async () => {
    await api.patch("/api/emergency/privacy").set("Authorization", `Bearer ${patientToken}`)
      .send({ showBloodType: false, showAllergies: false, showContacts: false }).expect(200);
    const res = await api.get(`/api/emergency/${emergencyToken}`).expect(200);
    expect(res.body.visible.bloodGroup).toBeUndefined();
    expect(res.body.visible.allergies).toBeUndefined();
    expect(res.body.visible.emergencyContacts).toBeUndefined();
  });

  it("grounds a first-aid question in the guideline library", async () => {
    const res = await api.post(`/api/emergency/${emergencyToken}/chat`)
      .send({ message: "Someone is shaking on the floor and may have epilepsy", language: "en" })
      .expect(200);
    expect(res.body.text).toContain("Call emergency services (123)");
    expect(res.body.text).toContain("seizure");
    expect(res.body.sources.some((s) => s.includes("IFRC"))).toBe(true);
    expect(["High", "Moderate"]).toContain(res.body.confidence);
    expect(res.body.disclaimer).toContain("Call emergency services (123)");
    expect(res.body.mode).toBe(llmMode());
  });

  it("acknowledges a knowledge gap and never guesses", async () => {
    const res = await api.post(`/api/emergency/${emergencyToken}/chat`)
      .send({ message: "What is the patient's income and insurance policy number?", language: "en" })
      .expect(200);
    expect(res.body.scope).toBe("out_of_scope");
    expect(res.body.text).toContain("I can help with simple first-aid steps only");
    expect(res.body.text).toMatch(/call emergency services \(123\)/i);
    expect(res.body.confidence).toBe("Knowledge Gap");
  });

  it("never refuses a possible emergency or self-harm message", async () => {
    const emergency = await api.post(`/api/emergency/${emergencyToken}/chat`)
      .send({ message: "He is in cardiac arrest, help!", language: "en" }).expect(200);
    expect(emergency.body.scope).toBe("emergency");
    expect(emergency.body.text).toContain("Call emergency services (123)");
    const selfHarm = await api.post(`/api/emergency/${emergencyToken}/chat`)
      .send({ message: "أريد أن أؤذي نفسي", language: "ar" }).expect(200);
    expect(selfHarm.body.scope).toBe("emergency");
    expect(selfHarm.body.text).toContain("١٢٣");
  });

  it("answers Arabic first-aid questions in Arabic with the 123 lead", async () => {
    const res = await api.post(`/api/emergency/${emergencyToken}/chat`)
      .send({ message: "شخص عنده تشنج، ماذا أفعل؟", language: "ar" }).expect(200);
    expect(res.body.scope).toBe("first_aid");
    expect(res.body.text).toContain("١٢٣");
  });

  it("rejects invalid tokens and empty messages", async () => {
    await api.get("/api/emergency/not-a-token").expect(400);
    await api.post(`/api/emergency/${emergencyToken}/chat`).send({ message: "" }).expect(400);
  });

  it("logs scans and chats in the hash-chained audit log", async () => {
    const session = await createSession({ id: "admin-emergency", role: "admin", email: "admin@test.example" }, { mfa: true });
    const audit = await api.get("/api/audit?limit=200").set("Authorization", `Bearer ${session.accessToken}`).expect(200);
    const actions = audit.body.auditLog.map((e) => e.action);
    expect(actions).toContain("emergency_page_viewed");
    expect(actions).toContain("emergency_chat");
    expect(actions).toContain("emergency_qr_created");
  });
});
