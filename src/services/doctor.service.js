import { getStore } from "../store/index.js";
import { httpError } from "../utils/http-error.js";

const COLLECTION = "doctors";

export async function getProfile(uid) {
  const doctor = await getStore().get(COLLECTION, uid);
  if (!doctor) throw httpError(404, "Doctor profile not found");
  return doctor;
}

// PUT: create or update the profile (keeps existing verified flag on update)
export async function saveProfile(uid, data) {
  const existing = await getStore().get(COLLECTION, uid);
  const now = new Date();
  if (existing) {
    return getStore().set(COLLECTION, uid, { ...data, updatedAt: now }, { merge: true });
  }
  return getStore().set(COLLECTION, uid, {
    ...data,
    verified: false,
    createdAt: now,
    updatedAt: now,
  });
}

// PATCH: partial update; the profile must already exist
export async function updateProfile(uid, data) {
  const existing = await getStore().get(COLLECTION, uid);
  if (!existing) {
    throw httpError(404, "Doctor profile not found, create it first with PUT /api/doctors/me");
  }
  return getStore().update(COLLECTION, uid, { ...data, updatedAt: new Date() });
}

export async function getOne(id) {
  const store = getStore();
  const [doctor, user] = await Promise.all([store.get(COLLECTION, id), store.get("users", id)]);
  if (!doctor) throw httpError(404, "Doctor not found");
  return { name: user?.name ?? null, ...doctor, id };
}

export async function list({ specialty, city, verified, limit = 20, startAfter }) {
  const where = [];
  if (specialty) where.push({ field: "specialty", op: "==", value: specialty });
  if (city) where.push({ field: "city", op: "==", value: city });
  if (verified !== undefined) where.push({ field: "verified", op: "==", value: verified });

  const store = getStore();
  const { items: doctors, nextCursor } = await store.query(COLLECTION, {
    where,
    orderBy: [{ field: "__id__", direction: "asc" }],
    limit,
    startAfter,
  });

  const users = await store.getMany(
    "users",
    doctors.map((doctor) => doctor.id),
  );

  return {
    doctors: doctors.map((doctor, index) => ({ name: users[index]?.name ?? null, ...doctor })),
    nextCursor,
  };
}

export async function setVerified(id, verified) {
  const existing = await getStore().get(COLLECTION, id);
  if (!existing) throw httpError(404, "Doctor not found");
  return getStore().update(COLLECTION, id, { verified, updatedAt: new Date() });
}
