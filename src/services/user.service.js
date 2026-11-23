import { getIdp } from "../auth/index.js";
import { getStore } from "../store/index.js";

const COLLECTION = "users";

export const getById = (id) => getStore().get(COLLECTION, id);

export const getAll = async ({ limit = 20, startAfter } = {}) => {
  const { items, nextCursor } = await getStore().query(COLLECTION, {
    orderBy: [{ field: "createdAt", direction: "desc" }],
    limit,
    startAfter,
  });
  return { users: items, nextCursor };
};

export const updateProfile = async (id, data) => {
  const existing = await getStore().get(COLLECTION, id);
  if (!existing) return null;

  if (data.name) await getIdp().updateUser(id, { displayName: data.name });
  await getStore().update(COLLECTION, id, { ...data, updatedAt: new Date() });
  return getById(id);
};

export const setRole = async (id, role) => {
  const existing = await getStore().get(COLLECTION, id);
  if (!existing) return null;

  await getIdp().setCustomUserClaims(id, { role });
  await getStore().update(COLLECTION, id, { role, updatedAt: new Date() });
  return getById(id);
};

export const remove = async (id) => {
  const existing = await getStore().get(COLLECTION, id);
  if (!existing) return false;

  try {
    await getIdp().deleteUser(id);
  } catch (error) {
    if (error.code !== "auth/user-not-found") throw error;
  }
  await getStore().delete(COLLECTION, id);
  return true;
};
