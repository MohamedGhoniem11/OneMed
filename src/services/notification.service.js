import { getStore } from "../store/index.js";
import { httpError } from "../utils/http-error.js";
import { sendToUser } from "./fcm.service.js";

const COLLECTION = "notifications";

export async function notify({ userId, title, body = "", type = "system" }) {
  if (!userId) return null;
  const saved = await getStore().add(COLLECTION, {
    userId,
    title,
    body,
    type,
    read: false,
    createdAt: new Date(),
  });
  await sendToUser(userId, { title, body }).catch(() => {});
  return saved;
}

export async function listForUser(userId, { limit = 100 } = {}) {
  return getStore().query(COLLECTION, {
    where: [{ field: "userId", op: "==", value: userId }],
    orderBy: [{ field: "createdAt", direction: "desc" }],
    limit,
  });
}

export async function markAllRead(userId) {
  const { items } = await listForUser(userId, { limit: 500 });
  await Promise.all(items.filter((n) => !n.read).map((n) => getStore().update(COLLECTION, n.id, { read: true })));
  return { updated: items.length };
}

export async function markRead(userId, id) {
  const note = await getStore().get(COLLECTION, id);
  if (!note || note.userId !== userId) throw httpError(404, "Notification not found");
  return getStore().update(COLLECTION, id, { read: true });
}

export async function removeForUser(userId, id) {
  const note = await getStore().get(COLLECTION, id);
  if (!note || note.userId !== userId) throw httpError(404, "Notification not found");
  await getStore().delete(COLLECTION, id);
  return { ok: true, id };
}
