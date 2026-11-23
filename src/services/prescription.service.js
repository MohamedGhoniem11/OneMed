import { db } from "../config/firebase.js";
import { httpError } from "./user.service.js";
import { validate } from "../utils/schema.js";
import { prescriptionSchema } from "../schemas/prescription.schema.js";

const toIso = (v) => (v?.toDate ? v.toDate().toISOString() : v);
const col = () => db.collection("prescriptions");
const format = (id, data) => ({
  id,
  ...data,
  createdAt: toIso(data.createdAt),
  updatedAt: toIso(data.updatedAt),
});

export async function create(doctorId, body) {
  const data = validate(prescriptionSchema, body);
  const ref = col().doc();
  const now = new Date();
  await ref.set({ ...data, doctorId, status: "confirmed", createdAt: now, updatedAt: now });
  return format(ref.id, (await ref.get()).data());
}

export async function list({ doctorId, patientId, limit = 20, startAfter } = {}) {
  let q = col();
  if (doctorId) q = q.where("doctorId", "==", doctorId);
  if (patientId) q = q.where("patientId", "==", patientId);
  q = q.orderBy("createdAt", "desc").limit(limit);
  if (startAfter) {
    const cursor = await col().doc(startAfter).get();
    if (cursor.exists) q = q.startAfter(cursor);
  }
  const snap = await q.get();
  const prescriptions = snap.docs.map((d) => format(d.id, d.data()));
  const nextCursor = snap.docs.length === limit ? snap.docs[snap.docs.length - 1].id : null;
  return { prescriptions, nextCursor };
}

export async function getById(id) {
  const snap = await col().doc(id).get();
  return snap.exists ? format(snap.id, snap.data()) : null;
}

export { httpError };
