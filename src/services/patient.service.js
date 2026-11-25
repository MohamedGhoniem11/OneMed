import { getStore } from "../store/index.js";
import { parseLimit } from "../utils/query.js";
import { httpError } from "../utils/http-error.js";
import { canReadPatient } from "../middleware/consent.js";
import { auditRequest } from "./audit.service.js";

const COLLECTION = "patients";
const RECORDS = "records";
const PRESCRIPTIONS = "prescriptions";

export const getPatient = (id) => getStore().get(COLLECTION, id);

/** Search patients by name, National ID, phone or UID, filtered by consent. */
export async function searchPatients(req, query, limit = 20) {
  const { items } = await getStore().query(COLLECTION, {
    orderBy: [{ field: "createdAt", direction: "desc" }],
    limit: 200,
  });
  const users = await getStore().getMany("users", items.map((p) => p.id));
  const nameFor = new Map(users.map((u, i) => [items[i]?.id, u?.name || ""]));
  const needle = String(query || "").trim().toLowerCase();
  const matches = items.filter((p) => {
    if (!needle) return true;
    return [p.id, p.name, nameFor.get(p.id), p.nationalId, p.phone]
      .some((value) => String(value || "").toLowerCase().includes(needle));
  });
  const visible = [];
  for (const patient of matches) {
    try {
      await canReadPatient(req, patient.id, { scope: "records" });
      visible.push({ ...patient, name: patient.name || nameFor.get(patient.id) || null });
    } catch {
      // Unauthorized matches are omitted, never returned as "not found".
    }
  }
  return visible.slice(0, parseLimit(limit));
}

/** Emergency override: written justification, bounded TTL, fully audited. */
export async function emergencyOverride(req, patientId, { reason, ttlMinutes = 15 }) {
  const patient = await getStore().get(COLLECTION, patientId);
  if (!patient) throw httpError(404, "Patient not found");
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
  await getStore().add("emergencyOverrides", {
    patientId,
    doctorId: req.user.uid,
    reason,
    createdAt: new Date(),
    expiresAt,
  });
  await auditRequest(req, {
    action: "emergency_override",
    resourceType: "patient",
    resourceId: patient.id,
    patientId: patient.id,
    purpose: reason,
    metadata: { expiresAt, ttlMinutes },
  });
  return {
    patientId: patient.id,
    reason,
    expiresAt,
    critical: {
      bloodGroup: patient.bloodGroup || null,
      allergies: patient.allergies || [],
      chronicDiseases: patient.chronicDiseases || [],
    },
  };
}

export async function listPatientRecords(patientId, { type, limit, startAfter } = {}) {
  const where = [{ field: "patientId", op: "==", value: patientId }];
  if (type) where.push({ field: "type", op: "==", value: type });
  return getStore().query(RECORDS, {
    where,
    orderBy: [{ field: "observedAt", direction: "desc" }],
    limit: parseLimit(limit),
    startAfter,
  });
}

export async function listPatientPrescriptions(patientId, { limit, startAfter } = {}) {
  return getStore().query(PRESCRIPTIONS, {
    where: [{ field: "patientId", op: "==", value: patientId }],
    orderBy: [{ field: "createdAt", direction: "desc" }],
    limit: parseLimit(limit),
    startAfter,
  });
}

export async function updatePatientProfile(patientId, data) {
  const existing = await getStore().get(COLLECTION, patientId);
  if (!existing) throw httpError(404, "Patient not found");
  return getStore().update(COLLECTION, patientId, { ...data, updatedAt: new Date() });
}