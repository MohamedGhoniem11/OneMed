import { getStore } from "../store/index.js";
import { httpError } from "../utils/http-error.js";
import { parseLimit } from "../utils/query.js";

const COLLECTION = "institutions";

export async function list({ type, city, active = true, limit, startAfter } = {}) {
  const where = [];
  if (type) where.push({ field: "type", op: "==", value: type });
  if (city) where.push({ field: "city", op: "==", value: city });
  if (active !== undefined) where.push({ field: "active", op: "==", value: active });
  return getStore().query(COLLECTION, {
    where,
    orderBy: [{ field: "__id__", direction: "asc" }],
    limit: parseLimit(limit),
    startAfter,
  });
}

export async function get(id) {
  return getStore().get(COLLECTION, id);
}

export async function create(data) {
  return getStore().add(COLLECTION, {
    ...data,
    verified: false,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function verify(id, verified) {
  const existing = await getStore().get(COLLECTION, id);
  if (!existing) throw httpError(404, "Institution not found");
  return getStore().update(COLLECTION, id, { verified, updatedAt: new Date() });
}