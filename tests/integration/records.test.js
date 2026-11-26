import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import { createSession } from "../../src/services/session.service.js";
import { getStore } from "../../src/store/index.js";

const api = request(app);
const here = path.dirname(fileURLToPath(import.meta.url));
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

const PATIENT = "user_patient_1";
const LAB = "user_lab_staff";
const DOCTOR = "user_doctor_1";
const ADMIN = "user_admin";

let labToken;
let doctorToken;
let patientToken;
let adminToken;

beforeAll(async () => {
  const store = getStore();
  for (const user of [
    { id: PATIENT, role: "patient", email: "patient@records.test", name: "Record Patient" },
    { id: LAB, role: "lab_staff", email: "lab@records.test", name: "Lab Technician" },
    { id: DOCTOR, role: "doctor", email: "doctor@records.test", name: "Dr. Records" },
    { id: ADMIN, role: "admin", email: "admin@records.test", name: "System Admin" },
  ]) {
    await store.set("users", user.id, { ...user, status: "active", createdAt: new Date() });
  }
  await store.set("patients", PATIENT, {
    id: PATIENT, userId: PATIENT, name: "Record Patient", nationalId: "29001010109999",
    dateOfBirth: "1990-01-01", gender: "female", bloodGroup: "O+", allergies: [],
    chronicDiseases: [], emergencyContact: { name: "Kin", relationship: "Sibling", phone: "01099998888" },
  });
  await store.set("doctors", LAB, { id: LAB, institutionId: "inst_lab", verified: true });
  await store.set("doctors", DOCTOR, { id: DOCTOR, institutionId: "inst_main", verified: true });
  await store.set("consents", "consent_lab", {
    patientId: PATIENT, granteeType: "institution", granteeId: "inst_lab",
    scope: ["records"], status: "active", grantedAt: new Date(),
  });
  await store.set("consents", "consent_doctor", {
    patientId: PATIENT, granteeType: "doctor", granteeId: DOCTOR,
    scope: ["records"], status: "active", grantedAt: new Date(),
  });

  const [labSession, doctorSession, patientSession, adminSession] = await Promise.all([
    createSession({ id: LAB, role: "lab_staff", email: "lab@records.test" }, { mfa: true }),
    createSession({ id: DOCTOR, role: "doctor", email: "doctor@records.test" }, { mfa: true }),
    createSession({ id: PATIENT, role: "patient", email: "patient@records.test" }),
    createSession({ id: ADMIN, role: "admin", email: "admin@records.test" }, { mfa: true }),
  ]);
  labToken = labSession.accessToken;
  doctorToken = doctorSession.accessToken;
  patientToken = patientSession.accessToken;
  adminToken = adminSession.accessToken;
});

describe("M2 medical ingestion API", () => {
  it("ingests CSV, normalizes values, encrypts the original and audits the event", async () => {
    const csv = "test,value,unit,range\nHemoglobin,14.2,g/dL,13.8-17.2\nGlucose,115,mg/dL,70-99";
    const res = await api
      .post("/api/records/ingest")
      .set(bearer(labToken))
      .field("patientId", PATIENT)
      .attach("file", Buffer.from(csv), { filename: "panel.csv", contentType: "text/csv" })
      .expect(201);

    expect(res.body.record.type).toBe("lab");
    expect(res.body.record.status).toBe("abnormal");
    expect(res.body.record.lifecycle).toBe("accessible");
    expect(res.body.record.data.values).toHaveLength(2);
    expect(res.body.record.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(res.body.upload.encryption).toBe("AES-256-GCM");
    const onDisk = fs.readFileSync(res.body.upload.storagePath);
    expect(onDisk.includes(Buffer.from("Hemoglobin"))).toBe(false);

    const download = await api.get(`/api/records/${res.body.record.id}/original`).set(bearer(labToken)).expect(200);
    expect(download.text).toBe(csv);

    const audit = await api.get("/api/audit").set(bearer(adminToken)).expect(200);
    expect(audit.body.auditLog.some((entry) => entry.action === "record_ingested")).toBe(true);
  });

  it("accepts a digital PDF and extracts its lab values", async () => {
    const res = await api
      .post("/api/records/ingest")
      .set(bearer(labToken))
      .field("patientId", PATIENT)
      .attach("file", path.join(here, "..", "fixtures", "lab-report.pdf"))
      .expect(201);
    expect(res.body.record.sourceFormat).toBe("pdf");
    expect(res.body.record.data.values.some((v) => v.name === "Hemoglobin")).toBe(true);
    expect(res.body.record.status).toBe("abnormal");
  });

  it("OCRs a scanned PDF with no embedded text layer", async () => {
    const res = await api
      .post("/api/records/ingest")
      .set(bearer(labToken))
      .field("patientId", PATIENT)
      .attach("file", path.join(here, "..", "fixtures", "scanned-lab.pdf"))
      .expect(201);
    expect(["pdf_ocr", "pdf_scan"]).toContain(res.body.record.sourceFormat);
    if (res.body.record.sourceFormat === "pdf_ocr") {
      expect(res.body.record.data.values.some((v) => /hemoglobin/i.test(v.name))).toBe(true);
    } else {
      expect(res.body.record.status).toBe("needs_review");
    }
  });

  it("hides unreviewed records from the patient until staff verifies them", async () => {
    const ingest = await api
      .post("/api/records/ingest")
      .set(bearer(labToken))
      .field("patientId", PATIENT)
      .attach("file", Buffer.from("No structured values in this document"), { filename: "scan.txt", contentType: "text/plain" })
      .expect(201);
    expect(ingest.body.record.status).toBe("needs_review");
    expect(ingest.body.record.lifecycle).toBe("manual_review");
    expect(ingest.body.record.lifecycleHistory.map((s) => s.step)).toContain("manual_review");

    const patientView = await api.get(`/api/records?patientId=${PATIENT}`).set(bearer(patientToken)).expect(200);
    expect(patientView.body.items.some((r) => r.id === ingest.body.record.id)).toBe(false);

    const pending = await api.get("/api/records/pending").set(bearer(labToken)).expect(200);
    expect(pending.body.items.some((r) => r.id === ingest.body.record.id)).toBe(true);
    await api.get(`/api/records/${ingest.body.record.id}`).set(bearer(patientToken)).expect(404);
    await api.get(`/api/records/${ingest.body.record.id}/original`).set(bearer(patientToken)).expect(404);

    const reviewed = await api
      .patch(`/api/records/${ingest.body.record.id}/review`)
      .set(bearer(labToken))
      .send({ values: [{ name: "Hemoglobin", value: 14.2, unit: "g/dL", referenceLow: 13.8, referenceHigh: 17.2 }], note: "Verified manually" })
      .expect(200);
    expect(reviewed.body.status).toBe("normal");
    expect(reviewed.body.reviewed).toBe(true);
    expect(reviewed.body.lifecycle).toBe("accessible");

    const after = await api.get(`/api/records?patientId=${PATIENT}`).set(bearer(patientToken)).expect(200);
    expect(after.body.items.some((r) => r.id === ingest.body.record.id)).toBe(true);
    await api.get(`/api/records/${ingest.body.record.id}`).set(bearer(patientToken)).expect(200);
  });

  it("supports manual entry by a doctor and blocks patient writes", async () => {
    const created = await api
      .post("/api/records/manual")
      .set(bearer(doctorToken))
      .send({
        patientId: PATIENT,
        type: "vital",
        title: "Blood pressure",
        observedAt: "2026-03-01T10:00:00.000Z",
        data: { values: [{ name: "Systolic", value: 128, unit: "mmHg", referenceLow: 90, referenceHigh: 120 }] },
      })
      .expect(201);
    expect(created.body.record.status).toBe("abnormal");
    expect(created.body.record.data.values[0].flag).toBe("high");

    await api
      .post("/api/records/manual")
      .set(bearer(patientToken))
      .send({ patientId: PATIENT, type: "note", title: "x", observedAt: new Date().toISOString(), data: { values: [] } })
      .expect(403);
  });

  it("rejects invalid formats and oversized/malformed payloads", async () => {
    await api
      .post("/api/records/ingest")
      .set(bearer(labToken))
      .field("patientId", PATIENT)
      .attach("file", Buffer.from("MZ\x00\x00"), { filename: "virus.exe", contentType: "application/octet-stream" })
      .expect(400);
    await api
      .post("/api/records/manual")
      .set(bearer(doctorToken))
      .send({ patientId: "missing-patient", type: "lab", title: "x", observedAt: new Date().toISOString(), data: { values: [] } })
      .expect(403);
    await api
      .post("/api/records/manual")
      .set(bearer(doctorToken))
      .send({ patientId: PATIENT, type: "lab", title: "x", observedAt: new Date().toISOString(), data: { values: [{ name: "Glucose" }] } })
      .expect(400);
  });
});
