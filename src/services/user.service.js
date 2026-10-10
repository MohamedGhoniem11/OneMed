import { db, admin } from "../config/firebase.js";

const col = db.collection("users");

const normalizeEmail = (email) => email.trim().toLowerCase();

const conflict = () => {
  const err = new Error("Email already exists");
  err.status = 409;
  return err;
};

export const create = async (data) => {
  const email = normalizeEmail(data.email);
  const ref = col.doc(); // ID عشوائي

  await db.runTransaction(async (t) => {
    const dup = await t.get(col.where("email", "==", email).limit(1));
    if (!dup.empty) throw conflict();
    t.set(ref, {
      ...data,
      email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return { id: ref.id, ...data, email };
};

export const getAll = async () => {
  const snap = await col.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getById = async (id) => {
  const doc = await col.doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

export const update = async (id, data) => {
  const ref = col.doc(id);

  const found = await db.runTransaction(async (t) => {
    const doc = await t.get(ref);
    if (!doc.exists) return false;

    const changes = { ...data };
    if (data.email !== undefined) {
      const email = normalizeEmail(data.email);
      const dup = await t.get(col.where("email", "==", email).limit(2));
      if (dup.docs.some((d) => d.id !== id)) throw conflict();
      changes.email = email;
    }

    t.update(ref, {
      ...changes,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return true;
  });

  return found ? getById(id) : null;
};

export const remove = async (id) => {
  const ref = col.doc(id);
  if (!(await ref.get()).exists) return false;
  await ref.delete();
  return true;
};