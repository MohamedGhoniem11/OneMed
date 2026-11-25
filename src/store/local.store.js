import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { httpError } from "../utils/http-error.js";

/**
 * Real file-backed persistence implementing the same contract as the Firestore
 * adapter. Used for offline demos and CI when no cloud credentials exist.
 *
 * Guarantees:
 * - writes are atomic (temp file + rename) and serialized;
 * - a corrupt database file is reported, never silently truncated;
 * - reads return deep copies, so callers cannot mutate the store in memory.
 */

const DB_VERSION = 1;
const ID_FIELD = "__id__";
const OPS = new Set(["==", "!=", ">", ">=", "<", "<=", "in", "not-in", "array-contains"]);

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

function serialize(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (isPlainObject(value)) {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) out[key] = serialize(item);
    }
    return out;
  }
  return value;
}

function compare(left, right) {
  if (left === right) return 0;
  if (left === undefined || left === null) return -1;
  if (right === undefined || right === null) return 1;
  if (typeof left === "number" && typeof right === "number") return left - right;
  return left < right ? -1 : 1;
}

function matches(doc, { field, op, value }) {
  const actual = field === ID_FIELD ? doc.id : doc[field];
  switch (op) {
    case "==":
      return actual === value;
    case "!=":
      return actual !== value;
    case ">":
      return compare(actual, value) > 0;
    case ">=":
      return compare(actual, value) >= 0;
    case "<":
      return compare(actual, value) < 0;
    case "<=":
      return compare(actual, value) <= 0;
    case "in":
      return Array.isArray(value) && value.includes(actual);
    case "not-in":
      return Array.isArray(value) && !value.includes(actual);
    case "array-contains":
      return Array.isArray(actual) && actual.includes(value);
    default:
      throw new Error(`Unsupported query operator: ${op}`);
  }
}

function normalizeWhere(where) {
  if (!Array.isArray(where)) return [];
  return where.map((clause) => {
    if (!clause || typeof clause.field !== "string" || !OPS.has(clause.op)) {
      throw new Error("Invalid where clause");
    }
    return { field: clause.field, op: clause.op, value: clause.value };
  });
}

function normalizeOrderBy(orderBy) {
  const list = Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : [];
  return list.map((clause) => {
    if (!clause || typeof clause.field !== "string") throw new Error("Invalid orderBy clause");
    return { field: clause.field, direction: clause.direction === "desc" ? "desc" : "asc" };
  });
}

export function createLocalStore({ dataDir, file } = {}) {
  if (!dataDir) throw new Error("createLocalStore requires a dataDir");
  const directory = path.resolve(dataDir);
  const dbFile = file ? path.resolve(file) : path.join(directory, "local-db.json");

  let loaded = null;
  let writeQueue = Promise.resolve();

  function load() {
    if (loaded) return loaded;
    if (!fs.existsSync(dbFile)) {
      loaded = { version: DB_VERSION, collections: {} };
      return loaded;
    }
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(dbFile, "utf8"));
    } catch (error) {
      throw new Error(
        `Local store at ${dbFile} is not valid JSON (${error.message}). ` +
          "Move it aside or fix it; refusing to overwrite data.",
        { cause: error },
      );
    }
    if (!isPlainObject(parsed) || !isPlainObject(parsed.collections)) {
      throw new Error(`Local store at ${dbFile} has an unsupported shape; refusing to overwrite data.`);
    }
    loaded = parsed;
    return loaded;
  }

  function collection(name) {
    const db = load();
    if (!isPlainObject(db.collections[name])) db.collections[name] = {};
    return db.collections[name];
  }

  function persist(db) {
    const snapshot = JSON.stringify(db, null, 2);
    writeQueue = writeQueue.then(async () => {
      await fsp.mkdir(path.dirname(dbFile), { recursive: true });
      const tmp = `${dbFile}.${process.pid}.${crypto.randomUUID()}.tmp`;
      await fsp.writeFile(tmp, snapshot, { encoding: "utf8", mode: 0o600 });
      await fsp.rename(tmp, dbFile);
    });
    return writeQueue;
  }

  const toRecord = (id, data) => structuredClone({ id, ...data });
  const stripId = (data) => {
    const { id: _ignored, ...rest } = data ?? {};
    return serialize(rest);
  };

  return {
    kind: "local",
    file: dbFile,

    async get(name, id) {
      if (!id) return null;
      const doc = collection(name)[id];
      return doc ? toRecord(id, doc) : null;
    },

    async getMany(name, ids) {
      const coll = collection(name);
      return ids.map((id) => (coll[id] ? toRecord(id, coll[id]) : null));
    },

    async set(name, id, data, { merge = false } = {}) {
      if (!id) throw new Error("set requires a document id");
      const db = load();
      const coll = collection(name);
      const payload = stripId(data);
      coll[id] = merge ? { ...(coll[id] || {}), ...payload } : payload;
      await persist(db);
      return toRecord(id, coll[id]);
    },

    async add(name, data) {
      const id = crypto.randomUUID();
      await this.set(name, id, data);
      return toRecord(id, collection(name)[id]);
    },

    async update(name, id, data) {
      const db = load();
      const coll = collection(name);
      if (!coll[id]) throw httpError(404, "Document not found");
      coll[id] = { ...coll[id], ...stripId(data) };
      await persist(db);
      return toRecord(id, coll[id]);
    },

    async delete(name, id) {
      const db = load();
      const coll = collection(name);
      if (!coll[id]) return false;
      delete coll[id];
      await persist(db);
      return true;
    },

    async vectorSearch(name, vector, { limit = 5 } = {}) {
      const { items } = await this.query(name, { limit: 1000 });
      const norm = Math.sqrt(vector.reduce((s, x) => s + x * x, 0)) || 1;
      const scored = items.map((doc) => {
        const v = Array.isArray(doc.embedding) ? doc.embedding : [];
        const vnorm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
        const score = v.length === vector.length
          ? vector.reduce((s, x, i) => s + x * (v[i] || 0), 0) / (norm * vnorm) : 0;
        return { ...doc, score };
      }).filter((doc) => doc.score > 0).sort((a, b) => b.score - a.score);
      return scored.slice(0, limit);
    },

    async query(name, { where = [], orderBy = [], limit, startAfter } = {}) {
      const coll = collection(name);
      const clauses = normalizeWhere(where);
      const orders = normalizeOrderBy(orderBy);
      let items = Object.entries(coll).map(([id, data]) => ({ id, ...data }));

      for (const clause of clauses) items = items.filter((doc) => matches(doc, clause));

      if (orders.length) {
        items.sort((a, b) => {
          for (const { field, direction } of orders) {
            const left = field === ID_FIELD ? a.id : a[field];
            const right = field === ID_FIELD ? b.id : b[field];
            const result = compare(left, right);
            if (result !== 0) return direction === "desc" ? -result : result;
          }
          return 0;
        });
      }

      if (startAfter) {
        const index = items.findIndex((doc) => doc.id === startAfter);
        if (index >= 0) items = items.slice(index + 1);
      }

      const max = Number.isFinite(limit) && limit >= 0 ? limit : items.length;
      const page = items.slice(0, max);
      const nextCursor = page.length === limit && page.length > 0 ? page[page.length - 1].id : null;
      return { items: page.map((doc) => structuredClone(doc)), nextCursor };
    },
  };
}
