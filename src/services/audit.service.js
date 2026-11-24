import crypto from "node:crypto";
import { getStore } from "../store/index.js";
import { parseLimit } from "../utils/query.js";

/**
 * Append-only, SHA-256 hash-chained audit trail (R25, OQ3).
 *
 * Each entry commits to the previous entry's hash, so editing or deleting any
 * historical record breaks verification from that point onward. Appends are
 * serialized in-process; the Firestore implementation would need a transaction
 * for multi-instance writers (documented limitation).
 */

const COLLECTION = "accessLog";
const GENESIS = "GENESIS";
const MAX_CHAIN_PAGE = 500;

function canonical(value) {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map((item) => canonical(item)).join(",")}]`;
  if (value && typeof value === "object") {
    const keys = Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

function hashEntry(prevHash, payload) {
  return crypto.createHash("sha256").update(`${prevHash}\n${canonical(payload)}`).digest("hex");
}

let appendQueue = Promise.resolve();

async function appendNow(entry) {
  const store = getStore();
  const { items } = await store.query(COLLECTION, {
    orderBy: [{ field: "seq", direction: "desc" }],
    limit: 1,
  });
  const previous = items[0] ?? null;
  const seq = (previous?.seq ?? 0) + 1;
  const prevHash = previous?.hash ?? GENESIS;
  const createdAt = new Date();
  const payload = {
    seq,
    actorId: entry.actorId ?? null,
    actorRole: entry.actorRole ?? null,
    action: entry.action,
    resourceType: entry.resourceType ?? null,
    resourceId: entry.resourceId ?? null,
    patientId: entry.patientId ?? null,
    purpose: entry.purpose ?? null,
    ip: entry.ip ?? "",
    userAgent: entry.userAgent ?? "",
    metadata: entry.metadata ?? null,
    createdAt,
  };
  const hash = hashEntry(prevHash, payload);
  const record = await store.add(COLLECTION, { ...payload, prevHash, hash });
  return record;
}

export function appendAudit(entry) {
  if (!entry?.action) throw new Error("Audit entry requires an action");
  const task = appendQueue.then(() => appendNow(entry));
  // Keep the queue healthy even if one append fails; callers still see the error.
  appendQueue = task.catch(() => {});
  return task;
}

export function auditRequest(req, entry) {
  return appendAudit({
    ...entry,
    actorId: entry.actorId ?? req.user?.uid ?? null,
    actorRole: entry.actorRole ?? req.user?.role ?? null,
    ip: req.ip ?? "",
    userAgent: req.get("user-agent") ?? "",
  });
}

async function allEntries() {
  const store = getStore();
  const entries = [];
  let cursor = null;
  for (;;) {
    const page = await store.query(COLLECTION, {
      orderBy: [{ field: "seq", direction: "asc" }],
      limit: MAX_CHAIN_PAGE,
      startAfter: cursor,
    });
    entries.push(...page.items);
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return entries;
}

export async function verifyChain() {
  const entries = await allEntries();
  let prevHash = GENESIS;
  let expectedSeq = 1;
  for (const entry of entries) {
    const { id: _id, hash, prevHash: storedPrev, ...payload } = entry;
    if (entry.seq !== expectedSeq) {
      return { valid: false, count: entries.length, brokenAt: entry.id, reason: "sequence gap" };
    }
    if (storedPrev !== prevHash) {
      return { valid: false, count: entries.length, brokenAt: entry.id, reason: "previous hash mismatch" };
    }
    if (hashEntry(prevHash, payload) !== hash) {
      return { valid: false, count: entries.length, brokenAt: entry.id, reason: "entry hash mismatch" };
    }
    prevHash = hash;
    expectedSeq += 1;
  }
  return { valid: true, count: entries.length, brokenAt: null, reason: null };
}

export async function listAudit({ limit, startAfter } = {}) {
  return getStore().query(COLLECTION, {
    orderBy: [{ field: "seq", direction: "desc" }],
    limit: parseLimit(limit),
    startAfter,
  });
}

export const auditInternals = { canonical, hashEntry, GENESIS, COLLECTION };
