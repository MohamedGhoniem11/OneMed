import { db, admin } from "../config/firebase.js";
import { httpError } from "./user.service.js";
const toIso = (v) => (v?.toDate ? v.toDate().toISOString() : v);
const format = (id, data) => ({
  id,
  ...data,
  createdAt: toIso(data.createdAt),
  updatedAt: toIso(data.updatedAt),
});
const col = () => db.collection("doctors");

export async function getProfile(uid) {
  const snap = await col().doc(uid).get();
  if (!snap.exists) throw httpError(404, "Doctor profile not found");
  return { id: snap.id, ...snap.data() };
}

// PUT: إنشاء أو تحديث البروفايل
export async function saveProfile(uid, data) {
  const ref = col().doc(uid);
  const snap = await ref.get();
  const now = new Date();
  if (snap.exists) {
    await ref.set({ ...data, updatedAt: now }, { merge: true });
  } else {
    await ref.set({ ...data, verified: false, createdAt: now, updatedAt: now });
  }
  return getProfile(uid);
}

// PATCH: تعديل جزئي (لازم البروفايل يكون موجود)
export async function updateProfile(uid, data) {
  const ref = col().doc(uid);
  const snap = await ref.get();
  if (!snap.exists)
    throw httpError(404, "Doctor profile not found, create it first with PUT /api/doctors/me");
  await ref.update({ ...data, updatedAt: new Date() });
  return getProfile(uid);
}

export async function getOne(id) {
  const [doc, user] = await Promise.all([
    col().doc(id).get(),
    db.collection("users").doc(id).get(),
  ]);
  if (!doc.exists) throw httpError(404, "Doctor not found");
  return { id, name: user.data()?.name ?? null, ...doc.data() };
}

export async function list({ specialty, city, verified, limit, startAfter }) {
  let q = col();
  if (specialty) q = q.where("specialty", "==", specialty);
  if (city) q = q.where("city", "==", city);
  if (verified !== undefined) q = q.where("verified", "==", verified);
  q = q.orderBy(admin.firestore.FieldPath.documentId()).limit(limit);
  if (startAfter) q = q.startAfter(startAfter);

  const snap = await q.get();
  const docs = snap.docs;

  // الاسم موجود في users، فنجيبه مرة واحدة لكل الدكاترة
  const users = docs.length
    ? await db.getAll(...docs.map((d) => db.collection("users").doc(d.id)))
    : [];

  const doctors = docs.map((d, i) => ({
    id: d.id,
    name: users[i].data()?.name ?? null,
    ...d.data(),
  }));
  const nextCursor = docs.length === limit ? docs[docs.length - 1].id : null;
  return { doctors, nextCursor };
}

export async function setVerified(id, verified) {
  const ref = col().doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw httpError(404, "Doctor not found");
  await ref.update({ verified, updatedAt: new Date() });
  return getOne(id);
}