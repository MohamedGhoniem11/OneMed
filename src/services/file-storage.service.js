import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ConfigError, env } from "../config/env.js";
import { getStorageBucket } from "../config/firebase.js";
import { getStore } from "../store/index.js";
import { httpError } from "../utils/http-error.js";

/**
 * Encrypted storage for original medical documents (R6/R8/R60).
 *
 * AES-256-GCM with a unique IV per file. The ciphertext lives on disk (or, in
 * a cloud deployment, behind this same port); only metadata and SHA-256
 * checksums are written to the database. The key never enters the database.
 */
const UPLOADS = "uploads";
const IV_BYTES = 12;
const TAG_BYTES = 16;
let cachedKey = null;

export function getUploadKey() {
  if (cachedKey) return cachedKey;
  if (env.uploadEncryptionKey) {
    cachedKey = Buffer.from(env.uploadEncryptionKey, "hex");
    return cachedKey;
  }
  if (env.isProduction) throw new ConfigError("UPLOAD_ENCRYPTION_KEY is required in production.");

  const keyFile = path.join(env.localDataDir, ".upload-key");
  if (fs.existsSync(keyFile)) {
    const value = fs.readFileSync(keyFile, "utf8").trim();
    if (!/^[0-9a-fA-F]{64}$/.test(value)) {
      throw new ConfigError(`Development upload key at ${keyFile} is invalid; delete it to regenerate.`);
    }
    cachedKey = Buffer.from(value, "hex");
    return cachedKey;
  }
  fs.mkdirSync(env.localDataDir, { recursive: true });
  cachedKey = crypto.randomBytes(32);
  fs.writeFileSync(keyFile, `${cachedKey.toString("hex")}\n`, { encoding: "utf8", mode: 0o600 });
  console.warn(
    `[storage] Generated a development AES-256 upload key at ${keyFile} (gitignored). ` +
      "Set UPLOAD_ENCRYPTION_KEY for shared or production environments.",
  );
  return cachedKey;
}

export function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function encryptBytes(buffer) {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", getUploadKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return { iv, tag: cipher.getAuthTag(), ciphertext };
}

export function decryptBytes({ iv, tag, ciphertext }) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", getUploadKey(), Buffer.from(iv));
  decipher.setAuthTag(Buffer.from(tag));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext)), decipher.final()]);
}

function safeSegment(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "unknown";
}

/** Persist an encrypted original and return its metadata document. */
export async function saveEncrypted({ buffer, patientId, filename, mimeType, uploadedBy, institutionId, checksum, format }) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw httpError(400, "Upload is empty");
  const key = getUploadKey();
  const id = crypto.randomUUID();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, ciphertext]);
  const storageDriver = env.storageDriver;
  let storedPath;
  if (storageDriver === "firebase") {
    const objectKey = `uploads/${safeSegment(patientId)}/${id}.enc`;
    await getStorageBucket().file(objectKey).save(payload, {
      metadata: { contentType: "application/octet-stream", metadata: { encryption: "AES-256-GCM" } },
    });
    storedPath = objectKey;
  } else {
    storedPath = path.join(env.uploadDir, safeSegment(patientId), `${id}.enc`);
    await fs.promises.mkdir(path.dirname(storedPath), { recursive: true });
    await fs.promises.writeFile(storedPath, payload, { mode: 0o600 });
  }

  const metadata = await getStore().add(UPLOADS, {
    id,
    patientId,
    uploadedBy: uploadedBy ?? null,
    institutionId: institutionId ?? null,
    filename: safeSegment(filename),
    mimeType: mimeType ?? "application/octet-stream",
    format,
    byteSize: buffer.length,
    sha256: checksum ?? sha256(buffer),
    encryption: "AES-256-GCM",
    storagePath: storedPath,
    storageDriver,
    createdAt: new Date(),
  });
  return metadata;
}

/** Read and decrypt an original document. Throws 404 if metadata/file is gone. */
export async function readEncrypted(uploadId) {
  const meta = await getStore().get(UPLOADS, uploadId);
  if (!meta) throw httpError(404, "Upload not found");
  let raw;
  if (meta.storageDriver === "firebase") {
    const file = getStorageBucket().file(meta.storagePath);
    const [exists] = await file.exists();
    if (!exists) throw httpError(404, "Original file is missing");
    [raw] = await file.download();
  } else {
    raw = await fs.promises.readFile(meta.storagePath).catch(() => {
      throw httpError(404, "Original file is missing");
    });
  }
  const iv = raw.subarray(0, IV_BYTES);
  const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = raw.subarray(IV_BYTES + TAG_BYTES);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getUploadKey(), iv);
  decipher.setAuthTag(tag);
  const buffer = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  if (sha256(buffer) !== meta.sha256) throw httpError(500, "Checksum verification failed");
  return { metadata: meta, buffer };
}

/** Remove the stored ciphertext for an upload (used by EDP erasure). */
export async function deleteEncryptedFile(meta) {
  if (!meta?.storagePath) return;
  if (meta.storageDriver === "firebase") {
    await getStorageBucket().file(meta.storagePath).delete({ ignoreNotFound: true }).catch(() => {});
  } else {
    await fs.promises.unlink(meta.storagePath).catch(() => {});
  }
}

export async function listUploads(patientId) {
  const where = patientId ? [{ field: "patientId", op: "==", value: patientId }] : [];
  return getStore().query(UPLOADS, {
    where,
    orderBy: [{ field: "createdAt", direction: "desc" }],
    limit: 100,
  });
}
