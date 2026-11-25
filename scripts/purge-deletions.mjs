/**
 * EDP right-to-erasure purge job. Processes deletion requests whose 30-day
 * window has elapsed, removes patient clinical data and marks the request done.
 * Run daily from a scheduler (cron / Cloud Scheduler in production).
 */
import "dotenv/config";
import { getStore } from "../src/store/index.js";
import { appendAudit } from "../src/services/audit.service.js";

const store = getStore();
const COLLECTIONS = ["records", "prescriptions", "consents", "notifications", "conversations", "messages", "emergencyQr", "nfcTokens", "connectionTokens", "uploads"];

async function main() {
  const now = new Date();
  const { items } = await store.query("deletionRequests", { limit: 500 });
  let purged = 0;
  for (const request of items.filter((r) => r.status === "pending" && new Date(r.dueAt) <= now)) {
    for (const collection of COLLECTIONS) {
      const rows = await store.query(collection, { where: [{ field: "patientId", op: "==", value: request.patientId }], limit: 500 });
      await Promise.all(rows.items.map((row) => store.delete(collection, row.id)));
    }
    await store.update("deletionRequests", request.id, { status: "completed", completedAt: now });
    await appendAudit({ action: "deletion_completed", resourceType: "patient", resourceId: request.patientId, patientId: request.patientId, actorRole: "system" });
    purged += 1;
  }
  console.log(`Deletion purge complete: ${purged} processed`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
