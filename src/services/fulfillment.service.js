import { getStore } from "../store/index.js";
import { httpError } from "../utils/http-error.js";
import { auditRequest } from "./audit.service.js";
import { notify } from "./notification.service.js";
import { resolveFulfillment } from "./token.service.js";
import { getById as getPrescription, updateByPharmacy } from "./prescription.service.js";
import { getById as getPharmacy, listNearby, whatsappDeepLink, getForUser } from "./pharmacy.service.js";
import { ORDER_STATUSES } from "../schemas/prescription.schema.js";

const ORDER_FLOW = ORDER_STATUSES.filter((s) => s !== "cancelled");

function medicinesOf(prescription) {
  return (prescription.items || prescription.medicines || []).map((m) => ({
    name: m.name || "",
    dose: m.dose || m.dosage || "",
    dosage: m.dosage || m.dose || "",
    frequency: m.frequency || "",
    duration: m.duration || "",
    instructions: m.instructions || m.notes || "",
    confidence: m.confidence ?? null,
  }));
}

async function patientLocation(patientId) {
  const patient = await getStore().get("patients", patientId);
  return patient?.location || null;
}

export async function publicPrescription(token, req) {
  const resolved = await resolveFulfillment(token);
  const prescription = await getPrescription(resolved.prescriptionId);
  if (!prescription) throw httpError(404, "Prescription not found");
  if (prescription.status !== "confirmed") throw httpError(409, "Prescription is not confirmed yet");
  if (new Date(prescription.linkExpiresAt || resolved.record.expiresAt) <= new Date()) throw httpError(400, "Fulfillment link has expired");
  const origin = await patientLocation(prescription.patientId);
  const pharmacies = await listNearby(origin || { lat: 31.2, lng: 29.92 });
  if (req) {
    await auditRequest(req, {
      action: "fulfillment_link_opened",
      resourceType: "prescription",
      resourceId: prescription.id,
      patientId: prescription.patientId,
      actorId: null,
      actorRole: "public",
    });
  }
  return {
    prescription: {
      id: prescription.id,
      patientName: prescription.patientName,
      doctorName: prescription.doctorName,
      status: prescription.status,
      orderStatus: prescription.orderStatus,
      pharmacyId: prescription.pharmacyId || null,
      expiresAt: prescription.linkExpiresAt,
      medicines: medicinesOf(prescription),
    },
    pharmacies: pharmacies.map((p) => ({
      id: p.id, name: p.name, address: p.address, city: p.city,
      whatsapp: p.whatsapp || p.whatsappNumber, hours: p.hours || p.openingHours,
      rating: p.rating, distanceKm: p.distanceKm, lat: p.location?.lat, lng: p.location?.lng,
    })),
  };
}

export async function selectPharmacy(token, pharmacyId, req) {
  const resolved = await resolveFulfillment(token);
  const prescription = await getPrescription(resolved.prescriptionId);
  if (!prescription) throw httpError(404, "Prescription not found");
  if (prescription.status !== "confirmed") throw httpError(409, "Prescription is not confirmed yet");
  if (prescription.orderStatus && prescription.orderStatus !== "received") throw httpError(409, "Order is already being fulfilled");
  const pharmacy = await getPharmacy(pharmacyId);
  if (!pharmacy || !pharmacy.active || pharmacy.status !== "approved") throw httpError(404, "Pharmacy not available");
  const url = whatsappDeepLink(pharmacy, medicinesOf(prescription), {
    patientName: prescription.patientName,
    doctorName: prescription.doctorName,
  });
  const updated = await updateByPharmacy(prescription.id, {
    pharmacyId,
    pharmacyName: pharmacy.name,
    orderStatus: "received",
    whatsappUrl: url,
  });
  await getStore().update("fulfillmentLinks", resolved.record.id, { usedAt: new Date() });
  await notify({
    userId: prescription.patientId,
    title: "Order sent to pharmacy",
    body: `${pharmacy.name} received your prescription via WhatsApp.`,
    type: "order",
  });
  if (req) {
    await auditRequest(req, {
      action: "pharmacy_selected",
      resourceType: "prescription",
      resourceId: prescription.id,
      patientId: prescription.patientId,
      actorId: null,
      actorRole: "public",
      metadata: { pharmacyId, pharmacyName: pharmacy.name },
    });
  }
  return { prescription: updated, whatsappUrl: url };
}

export async function ordersFor(user) {
  if (user.role === "admin") {
    const { items } = await getStore().query("prescriptions", { limit: 500 });
    return items.filter((p) => p.status === "confirmed" && p.orderStatus);
  }
  const pharmacy = await getForUser(user);
  if (!pharmacy) return [];
  const { items } = await getStore().query("prescriptions", {
    where: [{ field: "pharmacyId", op: "==", value: pharmacy.id }],
    limit: 500,
  });
  return items.filter((p) => p.status === "confirmed" && p.orderStatus);
}

export async function advanceOrder(id, user, req) {
  const prescription = await getPrescription(id);
  if (!prescription) throw httpError(404, "Prescription not found");
  if (user.role !== "admin") {
    const pharmacy = await getForUser(user);
    if (!pharmacy || prescription.pharmacyId !== pharmacy.id) throw httpError(403, "Forbidden");
  }
  const current = prescription.orderStatus || "received";
  const index = ORDER_FLOW.indexOf(current);
  if (index < 0 || index >= ORDER_FLOW.length - 1) throw httpError(409, "Order cannot advance further");
  const next = ORDER_FLOW[index + 1];
  const updated = await updateByPharmacy(id, { orderStatus: next });
  await notify({
    userId: prescription.patientId,
    title: "Prescription status updated",
    body: `Your order is now: ${next.replace("_", " ")}.`,
    type: "order",
  });
  await auditRequest(req, {
    action: "order_status_changed",
    resourceType: "prescription",
    resourceId: id,
    patientId: prescription.patientId,
    metadata: { from: current, to: next },
  });
  return updated;
}

export async function cancelOrder(id, user, req) {
  const prescription = await getPrescription(id);
  if (!prescription) throw httpError(404, "Prescription not found");
  if (user.role !== "admin") {
    const pharmacy = await getForUser(user);
    if (!pharmacy || prescription.pharmacyId !== pharmacy.id) throw httpError(403, "Forbidden");
  }
  if (["completed", "cancelled"].includes(prescription.orderStatus)) throw httpError(409, "Order is already final");
  const updated = await updateByPharmacy(id, { orderStatus: "cancelled" });
  await auditRequest(req, {
    action: "order_cancelled",
    resourceType: "prescription",
    resourceId: id,
    patientId: prescription.patientId,
  });
  return updated;
}
