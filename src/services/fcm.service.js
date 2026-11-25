import { getStore } from "../store/index.js";

const COLLECTION = "deviceTokens";

export async function registerToken(userId, token, platform = "web") {
  if (!token || typeof token !== "string" || token.length > 4096) throw new Error("Invalid device token");
  return getStore().set(COLLECTION, `${userId}:${token.slice(-32)}`, {
    userId, token, platform, createdAt: new Date(), updatedAt: new Date(),
  });
}

export async function sendToUser(userId, { title, body }) {
  const { items } = await getStore().query(COLLECTION, {
    where: [{ field: "userId", op: "==", value: userId }], limit: 100,
  });
  if (!items.length) return { delivered: 0, configured: false };
  try {
    const { getMessaging } = await import("firebase-admin/messaging");
    const result = await getMessaging().sendEach(items.map((t) => ({ token: t.token, notification: { title, body } })));
    return { delivered: result.successCount, failed: result.failureCount, configured: true };
  } catch {
    // Firebase Admin credentials/Credentials missing: in-app notifications still work.
    return { delivered: 0, configured: false, tokens: items.length };
  }
}
