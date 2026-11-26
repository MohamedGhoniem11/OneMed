import { getStore } from "../store/index.js";
import { httpError } from "../utils/http-error.js";
import { notify } from "./notification.service.js";

const CONVERSATIONS = "conversations";
const MESSAGES = "messages";

async function visibleConversation(conversationId, user) {
  const c = await getStore().get(CONVERSATIONS, conversationId);
  if (!c) throw httpError(404, "Conversation not found");
  const isParticipant = c.patientId === user.uid || c.otherUserId === user.uid || user.role === "admin";
  if (!isParticipant) throw httpError(403, "Forbidden");
  return c;
}

export async function listConversations(user) {
  const { items } = await getStore().query(CONVERSATIONS, {
    orderBy: [{ field: "updatedAt", direction: "desc" }],
    limit: 200,
  });
  return items.filter((c) => c.patientId === user.uid || c.otherUserId === user.uid || user.role === "admin");
}

export async function createConversation({ patientId, otherUserId, otherName, role }, user) {
  if (user.role === "patient" && user.uid !== patientId) throw httpError(403, "Forbidden");
  if (user.role !== "patient" && user.uid !== otherUserId && user.role !== "admin") throw httpError(403, "Forbidden");
  const existing = await getStore().query(CONVERSATIONS, {
    where: [
      { field: "patientId", op: "==", value: patientId },
      { field: "otherUserId", op: "==", value: otherUserId },
    ],
    limit: 1,
  });
  if (existing.items[0]) return existing.items[0];
  const now = new Date();
  return getStore().add(CONVERSATIONS, {
    patientId,
    otherUserId,
    otherName: otherName || "OneMed staff",
    role,
    startedAt: now,
    updatedAt: now,
  });
}

export async function removeConversation(conversationId, user) {
  const conversation = await visibleConversation(conversationId, user);
  const { items } = await getStore().query(MESSAGES, {
    where: [{ field: "conversationId", op: "==", value: conversationId }],
    limit: 500,
  });
  await Promise.all(items.map((m) => getStore().delete(MESSAGES, m.id)));
  await getStore().delete(CONVERSATIONS, conversationId);
  return { ok: true, id: conversation.id };
}

export async function listMessages(conversationId, user) {
  await visibleConversation(conversationId, user);
  const { items } = await getStore().query(MESSAGES, {
    where: [{ field: "conversationId", op: "==", value: conversationId }],
    limit: 500,
  });
  return items.sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
}

export async function sendMessage(conversationId, { text }, user) {
  const conversation = await visibleConversation(conversationId, user);
  if (!String(text || "").trim()) throw httpError(400, "Message is required");
  const now = new Date();
  const message = await getStore().add(MESSAGES, {
    conversationId,
    senderId: user.uid,
    text: String(text).trim(),
    sentAt: now,
    type: "text",
    createdAt: now,
  });
  await getStore().update(CONVERSATIONS, conversationId, { updatedAt: now });
  const recipient = user.uid === conversation.patientId ? conversation.otherUserId : conversation.patientId;
  await notify({ userId: recipient, title: "New message", body: String(text).trim().slice(0, 120), type: "message" });
  return message;
}
