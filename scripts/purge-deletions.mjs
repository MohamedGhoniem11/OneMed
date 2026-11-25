/**
 * EDP right-to-erasure purge job. Processes deletion requests whose 30-day
 * window has elapsed, removes stored clinical data and encrypted originals,
 * and revokes the account. The append-only access log is retained for legal
 * integrity and must contain no clinical payload (documented limitation).
 * Run daily from a scheduler (cron / Cloud Scheduler in production).
 */
import "dotenv/config";
import fs from "node:fs";
import { getStore } from "../src/store/index.js";
import { env } from "../src/config/env.js";
import { getIdp } from "../src/auth/index.js";
import { appendAudit } from "../src/services/audit.service.js";
import { revokeUserSessions } from "../src/services/session.service.js";

const store = getStore();
const COLLECTIONS = ["records", "prescriptions", "consents", "notifications", "conversations", "emergencyQr", "nfcTokens", "connectionTokens", "fulfillmentLinks", "emergencyOverrides", "uploads", "deviceTokens", "aiIssues"];

async function deleteWhere(collection, field, value) {
  const { items } = await store.query(collection, { where: [{ field, op: "==", value }], limit: 500 });
  await Promise.all(items.map((row) => store.delete(collection, row.id)));
  return items;
}

async function purgePatient(patientId) {
  // Encrypted originals must be removed from disk, not just their metadata.
  const uploads = await deleteWhere("uploads", "patientId", patientId);
  for (const upload of uploads) {
    if (upload.storagePath) await fs.promises.unlink(upload.storagePath).catch(() => {});
  }
  for (const collection of COLLECTIONS.filter((c) => c !== "uploads")) {
    const field = ["deviceTokens", "authSessions", "userMfa", "users", "aiIssues"].includes(collection) ? "userId" : "patientId";
    await deleteWhere(collection, field, patientId);
  }

  // Conversations can be indexed by either participant; delete both directions.
  const conversationIds = new Set();
  for (const field of ["patientId", "otherUserId"]) {
    const { items } = await store.query("conversations", { where: [{ field, op: "==", value: patientId }], limit: 500 });
    items.forEach((c) => conversationIds.add(c.id));
  }
  for (const id of conversationIds) {
    await deleteWhere("messages", "conversationId", id);
    await store.delete("conversations", id).catch(() => {});
  }

  await revokeUserSessions(patientId).catch(() => {});
  await getIdp().deleteUser(patientId).catch(() => {});
  await store.delete("userMfa", patientId).catch(() => {});
  await store.delete("patients", patientId).catch(() => {});
  await store.delete("users", patientId).catch(() => {});
}

async function main() {
  const now = new Date();
  const { items } = await store.query("deletionRequests", { limit: 500 });
  let purged = 0;
  for (const request of items.filter((r) => r.status === "pending" && new Date(r.dueAt) <= now)) {
    await purgePatient(request.patientId);
    await store.update("deletionRequests", request.id, { status: "completed", completedAt: now });
    await appendAudit({ action: "deletion_completed", resourceType: "patient", resourceId: request.patientId, patientId: request.patientId, actorRole: "system" });
    purged += 1;
  }
  console.log(`Deletion purge complete: ${purged} processed (upload dir: ${env.uploadDir})`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
