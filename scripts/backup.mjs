/** Encrypted backup of all OneMed collections. Usage: npm run backup [-- out.enc.json] */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { getStore } from "../src/store/index.js";
import { env } from "../src/config/env.js";
import { encryptBytes, getUploadKey } from "../src/services/file-storage.service.js";

export const COLLECTIONS = [
  "users", "patients", "doctors", "pharmacies", "institutions", "records", "prescriptions",
  "consents", "emergencyQr", "nfcTokens", "connectionTokens", "fulfillmentLinks",
  "accessLog", "notifications", "conversations", "messages", "uploads", "credits",
  "creditsLedger", "guidelineChunks", "deletionRequests", "userMfa", "authSessions",
  "otpChallenges", "deviceTokens", "aiIssues", "emergencyOverrides",
];

export async function createBackup() {
  const store = getStore();
  const data = { version: 1, createdAt: new Date().toISOString(), collections: {} };
  for (const name of COLLECTIONS) {
    const { items } = await store.query(name, { limit: 10000 });
    data.collections[name] = items;
  }
  const encrypted = encryptBytes(Buffer.from(JSON.stringify(data), "utf8"));
  return {
    version: 1,
    keyId: getUploadKey().length,
    iv: encrypted.iv.toString("base64"),
    tag: encrypted.tag.toString("base64"),
    ciphertext: encrypted.ciphertext.toString("base64"),
    counts: Object.fromEntries(Object.entries(data.collections).map(([k, v]) => [k, v.length])),
  };
}

async function main() {
  if (!env.uploadEncryptionKey && env.isProduction) throw new Error("UPLOAD_ENCRYPTION_KEY is required for backups");
  const output = process.argv[2] ? path.resolve(process.argv[2]) : path.join(env.backupDir, `backup-${Date.now()}.enc.json`);
  await fs.promises.mkdir(path.dirname(output), { recursive: true });
  const result = await createBackup();
  await fs.promises.writeFile(output, JSON.stringify(result, null, 2), { mode: 0o600 });
  console.log(`Backup written to ${output}`);
  console.log(`Collections: ${Object.keys(result.counts).length}, records: ${Object.values(result.counts).reduce((a, b) => a + b, 0)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
