import { getStore } from "../store/index.js";
import { validate } from "../utils/schema.js";
import { confirmSchema, prescriptionSchema } from "../schemas/prescription.schema.js";
import { createFulfillment } from "./token.service.js";
import { notify } from "./notification.service.js";
import { httpError } from "../utils/http-error.js";

const COLLECTION = "prescriptions";

async function namesFor(doctorId, patientId) {
  const [user, patient] = await Promise.all([
    getStore().get("users", doctorId),
    getStore().get("patients", patientId),
  ]);
  return {
    doctorName: user?.name || user?.email || "Doctor",
    patientName: patient?.name || patient?.fullName || "Patient",
  };
}

export async function create(doctorId, body) {
  const data = validate(prescriptionSchema, body);
  const now = new Date();
  const names = await namesFor(doctorId, data.patientId);
  return getStore().add(COLLECTION, {
    ...data,
    ...names,
    doctorId,
    status: "pending",
    extractionStatus: data.extractionStatus || "extracted",
    orderStatus: null,
    createdAt: now,
    updatedAt: now,
  });
}

export async function confirm(id, doctorId, body, { actorName } = {}) {
  const prescription = await getStore().get(COLLECTION, id);
  if (!prescription) throw httpError(404, "Prescription not found");
  if (prescription.doctorId !== doctorId) throw httpError(403, "Forbidden");
  if (prescription.status === "confirmed") throw httpError(409, "Prescription already confirmed");
  const clean = validate(confirmSchema, body);
  if (clean.confirmed !== true) throw httpError(400, "Doctor confirmation is required");
  const names = await namesFor(doctorId, prescription.patientId);
  const link = await createFulfillment({ prescriptionId: id, patientId: prescription.patientId });
  const updated = await getStore().update(COLLECTION, id, {
    items: clean.items,
    ...names,
    status: "confirmed",
    extractionStatus: "confirmed",
    linkToken: link.token,
    linkExpiresAt: link.expiresAt,
    fulfillmentLink: link.url,
    orderStatus: null,
    updatedAt: new Date(),
  });
  await notify({
    userId: prescription.patientId,
    title: "Prescription ready for fulfillment",
    body: `${names.doctorName} confirmed a prescription. Choose a pharmacy to send your order.`,
    type: "prescription",
  });
  return { ...updated, actorName };
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

export async function updateByPharmacy(id, patch) {
  return getStore().update(COLLECTION, id, { ...patch, updatedAt: new Date() });
}
