import { admin, db } from "../config/firebase.js";

const col = db.collection("users");

const httpError = (status, message) => Object.assign(new Error(message), { status });

export const getById = async (id) => {
  const doc = await col.doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

export const getAll = async ({ limit = 20, startAfter } = {}) => {
  let q = col.orderBy("createdAt", "desc").limit(limit);
  if (startAfter) {
    const cursor = await col.doc(startAfter).get();
    if (cursor.exists) q = q.startAfter(cursor);
  }
  const snap = await q.get();
  const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const nextCursor = snap.docs.length === limit ? snap.docs.at(-1).id : null;
  return { users, nextCursor };
};

export const updateProfile = async (id, data) => {
  const ref = col.doc(id);
  if (!(await ref.get()).exists) return null;

  if (data.name) await admin.auth().updateUser(id, { displayName: data.name });
  await ref.update({
    ...data,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return getById(id);
};

export const setRole = async (id, role) => {
  const ref = col.doc(id);
  if (!(await ref.get()).exists) return null;

  await admin.auth().setCustomUserClaims(id, { role });
  await ref.update({
    role,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return getById(id);
};

export const remove = async (id) => {
  const ref = col.doc(id);
  if (!(await ref.get()).exists) return false;

  try {
    await admin.auth().deleteUser(id);
  } catch (e) {
    if (e.code !== "auth/user-not-found") throw e;
  }
  await ref.delete();
  return true;
};

export { httpError };