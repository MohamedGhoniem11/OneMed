/** Restore an encrypted OneMed backup. Usage: npm run restore:backup -- <file> --confirm */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { getStore } from "../src/store/index.js";
import { decryptBytes } from "../src/services/file-storage.service.js";
import { COLLECTIONS } from "./backup.mjs";

export async function restoreBackup(file) {
  const payload = JSON.parse(await fs.promises.readFile(path.resolve(file), "utf8"));
  if (payload.version !== 1 || !payload.ciphertext) throw new Error("Unsupported backup format");
  const data = JSON.parse(decryptBytes({
    iv: Buffer.from(payload.iv, "base64"),
    tag: Buffer.from(payload.tag, "base64"),
    ciphertext: Buffer.from(payload.ciphertext, "base64"),
  }).toString("utf8"));
  if (!data?.collections || typeof data.collections !== "object") throw new Error("Backup payload is invalid");

  const store = getStore();
  const restored = {};
  for (const name of COLLECTIONS) {
    const records = data.collections[name] || [];
    for (const record of records) {
      const { id, ...body } = record;
      if (!id) continue;
      await store.set(name, id, body);
    }
    restored[name] = records.length;
  }
  return restored;
}

async function main() {
  const file = process.argv[2];
  if (!file || !process.argv.includes("--confirm")) {
    console.error("Usage: npm run restore:backup -- <file> --confirm");
    process.exitCode = 1;
    return;
  }
  const restored = await restoreBackup(file);
  console.log("Restore complete", restored);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
