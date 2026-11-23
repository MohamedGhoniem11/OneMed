import { getStore } from "../store/index.js";
import { validate } from "../utils/schema.js";
import { prescriptionSchema } from "../schemas/prescription.schema.js";

const COLLECTION = "prescriptions";

export async function create(doctorId, body) {
  const data = validate(prescriptionSchema, body);
  const now = new Date();
  // NOTE (B5): the doctor confirmation/extraction lifecycle and the 24h
  // fulfillment link are implemented in M5. Until then this endpoint accepts
  // already-reviewed prescriptions, matching the existing prototype behavior.
  return getStore().add(COLLECTION, {
    ...data,
    doctorId,
    status: "confirmed",
    createdAt: now,
    updatedAt: now,
  });
}

export async function list({ doctorId, patientId, limit = 20, startAfter } = {}) {
  const where = [];
  if (doctorId) where.push({ field: "doctorId", op: "==", value: doctorId });
  if (patientId) where.push({ field: "patientId", op: "==", value: patientId });

  const { items, nextCursor } = await getStore().query(COLLECTION, {
    where,
    orderBy: [{ field: "createdAt", direction: "desc" }],
    limit,
    startAfter,
  });
  return { prescriptions: items, nextCursor };
}

export async function getById(id) {
  return getStore().get(COLLECTION, id);
}
