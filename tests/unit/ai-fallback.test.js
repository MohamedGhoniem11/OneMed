import { beforeAll, describe, expect, it, vi } from "vitest";

// Force Gemini mode so the mocked `generate` is actually exercised.
vi.hoisted(() => { process.env.GEMINI_API_KEY = "test-only-key"; });

vi.mock("../../src/services/llm.service.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    embed: vi.fn(async () => [[1, 0, 0]]),
    generate: vi.fn(async () => { throw new Error("Gemini 429"); }),
  };
});

import { doctorChat } from "../../src/services/doctor-chat.service.js";
import { getStore } from "../../src/store/index.js";

const P = "fallback_patient";
const D = "fallback_doctor";
const req = { user: { uid: D, role: "doctor" }, ip: "127.0.0.1", get: () => "" };

beforeAll(async () => {
  const store = getStore();
  await store.set("users", P, { id: P, role: "patient", email: "p@fallback.test", status: "active" });
  await store.set("users", D, { id: D, role: "doctor", email: "d@fallback.test", status: "active" });
  await store.set("patients", P, { id: P, name: "Fallback Patient", bloodGroup: "O+", allergies: [], chronicDiseases: [] });
  await store.set("records", "fallback_rec", {
    id: "fallback_rec", patientId: P, type: "lab", title: "HbA1c",
    data: { hba1c: 7.1 }, observedAt: "2026-03-01", createdAt: new Date(),
  });
  await store.set("guidelineChunks", "fallback_kb", {
    id: "fallback_kb", source: "Test guideline", section: "HbA1c",
    language: "en", text: "HbA1c HbA1c HbA1c recorded value trend", tags: ["hba1c"],
    embedding: [1, 0, 0], embeddingModel: "test-embedding",
  });
});

describe("AI failure visibility", () => {
  it("labels a failed doctor generation as fallback with a localized retry", async () => {
    const res = await doctorChat(req, P, "HbA1c trend", "ar");
    expect(res.mode).toBe("fallback");
    expect(res.retryable).toBe(true);
    expect(res.error).toContain("إعادة المحاولة");
    expect(res.text).toContain("responsible for clinical decisions");
  });
});
