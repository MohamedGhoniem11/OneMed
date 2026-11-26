/** Move aged accessible records to the archived lifecycle state (Fig 6 p42-43). */
import "dotenv/config";
import { getStore } from "../src/store/index.js";
import { env } from "../src/config/env.js";
import { appendAudit } from "../src/services/audit.service.js";

async function main() {
  const cutoff = new Date(Date.now() - env.archiveAfterDays * 86400000);
  const store = getStore();
  const { items } = await store.query("records", { where: [{ field: "status", op: "==", value: "accessible" }], limit: 5000 });
  let archived = 0;
  for (const record of items) {
    const when = new Date(record.observedAt || record.createdAt || 0);
    if (when >= cutoff) continue;
    await store.update("records", record.id, {
      status: "archived", lifecycle: "archived", archivedAt: new Date(), updatedAt: new Date(),
    });
    archived += 1;
  }
  await appendAudit({ action: "records_archived", actorRole: "system", metadata: { archived, cutoff: cutoff.toISOString() } });
  console.log(`Archived ${archived} record(s) older than ${env.archiveAfterDays} days`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
