import admin from "firebase-admin";
import { getDb } from "../config/firebase.js";
import { httpError } from "../utils/http-error.js";

/**
 * Firestore implementation of the persistence port. Mirrors the local store's
 * contract so services are storage-agnostic.
 *
 * Reads expose timestamps as ISO strings (matching the local adapter) while
 * writes keep native Date values so Firestore stores real timestamps.
 */

const ID_FIELD = "__id__";

function toIso(value) {
  if (value && typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toIso);
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value)) out[key] = toIso(item);
    return out;
  }
  return value;
}

const toRecord = (snapshot) => ({ id: snapshot.id, ...toIso(snapshot.data()) });
const stripId = (data) => {
  const { id: _ignored, ...rest } = data ?? {};
  return rest;
};

function orderByField(field) {
  return field === ID_FIELD ? admin.firestore.FieldPath.documentId() : field;
}

const isNotFound = (error) => error?.code === 5 || error?.code === "not-found";

export function createFirestoreStore() {
  const db = getDb();

  return {
    kind: "firestore",

    async get(name, id) {
      if (!id) return null;
      const snapshot = await db.collection(name).doc(id).get();
      return snapshot.exists ? toRecord(snapshot) : null;
    },

    async getMany(name, ids) {
      if (ids.length === 0) return [];
      const snapshots = await db.getAll(...ids.map((id) => db.collection(name).doc(id)));
      return snapshots.map((snapshot) => (snapshot.exists ? toRecord(snapshot) : null));
    },

    async set(name, id, data, { merge = false } = {}) {
      if (!id) throw new Error("set requires a document id");
      const ref = db.collection(name).doc(id);
      await ref.set(stripId(data), { merge });
      return toRecord(await ref.get());
    },

    async add(name, data) {
      const ref = await db.collection(name).add(stripId(data));
      return toRecord(await ref.get());
    },

    async update(name, id, data) {
      const ref = db.collection(name).doc(id);
      try {
        await ref.update(stripId(data));
      } catch (error) {
        if (isNotFound(error)) throw httpError(404, "Document not found");
        throw error;
      }
      return toRecord(await ref.get());
    },

    async delete(name, id) {
      const ref = db.collection(name).doc(id);
      const snapshot = await ref.get();
      if (!snapshot.exists) return false;
      await ref.delete();
      return true;
    },

    async query(name, { where = [], orderBy = [], limit, startAfter } = {}) {
      let query = db.collection(name);
      for (const clause of where) query = query.where(clause.field, clause.op, clause.value);
      for (const clause of orderBy) query = query.orderBy(orderByField(clause.field), clause.direction);
      if (Number.isFinite(limit)) query = query.limit(limit);
      if (startAfter) {
        const cursor = await db.collection(name).doc(startAfter).get();
        if (cursor.exists) query = query.startAfter(cursor);
      }
      const snapshot = await query.get();
      const items = snapshot.docs.map(toRecord);
      const nextCursor = Number.isFinite(limit) && items.length === limit ? items[items.length - 1].id : null;
      return { items, nextCursor };
    },
  };
}
