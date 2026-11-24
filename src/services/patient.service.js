import { getStore } from "../store/index.js";
import { parseLimit } from "../utils/query.js";
import { httpError } from "../utils/http-error.js";

const COLLECTION = "patients";
const RECORDS = "records";
const PRESCRIPTIONS = "prescriptions";

export const getPatient = (id) => getStore().get(COLLECTION, id);

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