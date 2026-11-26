import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getStore } from "../../src/store/index.js";
import { createBackup } from "../../scripts/backup.mjs";
import { restoreBackup } from "../../scripts/restore-backup.mjs";

describe("encrypted backup and restore", () => {
  it("round-trips seeded data after a simulated loss", async () => {
    const store = getStore();
    await store.set("users", "backup_user", { id: "backup_user", name: "Backup User", role: "patient", status: "active", createdAt: new Date() });
    const backup = await createBackup();
    expect(backup.version).toBe(1);
    expect(backup.counts.users).toBeGreaterThan(0);

    const file = path.join(process.env.LOCAL_DATA_DIR, "backup-test.enc.json");
    await fs.promises.writeFile(file, JSON.stringify(backup), { mode: 0o600 });
    await store.delete("users", "backup_user");
    expect(await store.get("users", "backup_user")).toBeNull();

    const restored = await restoreBackup(file);
    expect(restored.users).toBeGreaterThan(0);
    const revived = await store.get("users", "backup_user");
    expect(revived?.name).toBe("Backup User");
    await fs.promises.unlink(file).catch(() => {});
  });
});
