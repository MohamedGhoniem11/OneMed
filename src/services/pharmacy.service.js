import { getStore } from "../store/index.js";
import { httpError } from "../utils/http-error.js";
import { validate } from "../utils/schema.js";
import { pharmacySchema } from "../schemas/pharmacy.schema.js";

const COLLECTION = "pharmacies";

export function haversineKm(a, b) {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(a.lng) || !Number.isFinite(b.lat) || !Number.isFinite(b.lng)) return Infinity;
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

export async function listNearby(origin, { limit = 50 } = {}) {
  const { items } = await getStore().query(COLLECTION, {
    where: [
      { field: "active", op: "==", value: true },
      { field: "status", op: "==", value: "approved" },
    ],
    limit,
  });
  return items
    .map((p) => ({ ...p, distanceKm: Math.round(haversineKm(origin, p.location) * 10) / 10 }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export async function getById(id) {
  return getStore().get(COLLECTION, id);
}

export async function getForUser(user) {
  const institutionId = user?.institutionId || user?.affiliation?.institutionId;
  if (!institutionId) return null;
  const byInstitution = await getStore().query(COLLECTION, {
    where: [{ field: "institutionId", op: "==", value: institutionId }],
    limit: 1,
  });
  if (byInstitution.items[0]) return byInstitution.items[0];
  // Never silently fall back to another pharmacy: that enables cross-tenant
  // order reading and WhatsApp-number takeover.
  return null;
}

export async function updateProfile(id, body) {
  const existing = await getStore().get(COLLECTION, id);
  if (!existing) throw httpError(404, "Pharmacy not found");
  const patch = validate(pharmacySchema, { ...existing, ...body }, { partial: true });
  return getStore().update(COLLECTION, id, { ...patch, whatsapp: patch.whatsapp || existing.whatsapp, updatedAt: new Date() });
}

export function whatsappDeepLink(pharmacy, medicines, { patientName = "", doctorName = "" } = {}) {
  let phone = String(pharmacy.whatsapp || pharmacy.whatsappNumber || "").replace(/\D/g, "");
  if (!phone) throw httpError(400, "Pharmacy has no WhatsApp number");
  // Egyptian mobile numbers are stored locally as 01xxxxxxxxx; wa.me expects
  // the full international number (20 + 9 digits).
  if (phone.startsWith("0") && phone.length === 11) phone = `20${phone.slice(1)}`;
  const lines = (medicines || []).map((m, i) => `${i + 1}. ${m.name || ""} ${m.dose || m.dosage || ""} - ${m.frequency || ""} - ${m.duration || ""}`.trim());
  const text = [
    `Hello ${pharmacy.name},`,
    "",
    "I would like to order the following prescription from OneMed:",
    `*Doctor:* ${doctorName || "-"}`,
    `*Patient:* ${patientName || "-"}`,
    "",
    "*Medicines:*",
    ...lines,
  ].join("\n");
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
