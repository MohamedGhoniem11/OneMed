import { FieldPath } from "firebase-admin/firestore";
import { getDb } from "../config/firebase.js";
import { httpError } from "../utils/http-error.js";
import { env } from "../config/env.js";

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
function cleanForFirestore(value) {
  if (Array.isArray(value)) return value.map(cleanForFirestore);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) out[key] = cleanForFirestore(item);
    }
    return out;
  }
  return value;
}

const stripId = (data) => {
  const { id: _ignored, ...rest } = data ?? {};
  return cleanForFirestore(rest);
};

function orderByField(field) {
  return field === ID_FIELD ? FieldPath.documentId() : field;
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

    async vectorSearch(name, vector, { limit = 5, field = "embedding" } = {}) {
      if (env.llmDriver === "cloud" && name === "guidelineChunks") {
        const res = await fetch(`${env.functionsBaseUrl}/searchGuidelines`, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ embedding: vector, limit }), signal: AbortSignal.timeout(20000),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw httpError(502, json.message || "Cloud guideline search failed");
        return json.chunks || [];
      }
      try {
        const snapshot = await db.collection(name).findNearest(field, vector, {
          limit,
          distanceMeasure: "COSINE",
        }).get();
        return snapshot.docs.map(toRecord);
      } catch {
        // No vector index yet: deterministic cosine fallback over the curated library.
        const snapshot = await db.collection(name).limit(500).get();
        const norm = Math.sqrt(vector.reduce((s, x) => s + x * x, 0)) || 1;
        return snapshot.docs.map(toRecord).map((doc) => {
          const v = Array.isArray(doc[field]) ? doc[field] : [];
          const vnorm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
          const score = v.length === vector.length ? vector.reduce((s, x, i) => s + x * v[i], 0) / (norm * vnorm) : 0;
          return { ...doc, score };
        }).filter((doc) => doc.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
      }
    },

    async query(name, { where = [], orderBy = [], limit, startAfter } = {}) {
      const run = async (withOrder) => {
        let query = db.collection(name);
        for (const clause of where) query = query.where(clause.field, clause.op, clause.value);
        if (withOrder) for (const clause of orderBy) query = query.orderBy(orderByField(clause.field), clause.direction);
        if (withOrder && Number.isFinite(limit)) query = query.limit(limit);
        if (withOrder && startAfter) {
          const cursor = await db.collection(name).doc(startAfter).get();
          if (cursor.exists) query = query.startAfter(cursor);
        }
        const snapshot = await query.get();
        return snapshot.docs.map(toRecord);
      };

      let items;
      try {
        items = await run(orderBy.length > 0);
      } catch (error) {
        const missingIndex = error?.code === 9 || /requires an index/i.test(error?.message || "");
        if (!missingIndex || orderBy.length === 0) throw error;
        // No composite index deployed yet: filter/sort in memory for correctness.
        items = await run(false);
        items.sort((a, b) => {
          for (const { field, direction } of orderBy) {
            const left = field === ID_FIELD ? a.id : a[field];
            const right = field === ID_FIELD ? b.id : b[field];
            if (left === right) continue;
            const result = left < right ? -1 : 1;
            return direction === "desc" ? -result : result;
          }
          return 0;
        });
        if (startAfter) {
          const index = items.findIndex((doc) => doc.id === startAfter);
          if (index >= 0) items = items.slice(index + 1);
        }
      }
      const page = Number.isFinite(limit) ? items.slice(0, limit) : items;
      const nextCursor = Number.isFinite(limit) && items.length > limit ? page[page.length - 1]?.id : null;
      return { items: page, nextCursor };
    },
  };
}
