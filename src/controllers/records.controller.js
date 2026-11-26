import * as service from "../services/ingestion.service.js";
import { readEncrypted } from "../services/file-storage.service.js";
import { auditRequest } from "../services/audit.service.js";
import { parseLimit } from "../utils/query.js";

const send = (fn, status = 200) => async (req, res, next) => {
  try { res.status(status).json(await fn(req, res)); } catch (error) { next(error); }
};

export const list = send((req) =>
  service.listVisibleRecords(req, {
    type: req.query.type,
    patientId: req.query.patientId,
    limit: parseLimit(req.query.limit),
  }),
);

export const pending = send(() => service.pendingReview());

export const getOne = send((req) => service.getVisibleRecord(req, req.params.id));

export const ingestFile = send(async (req) => {
  const result = await service.ingestFile(req);
  return { ...result, status: result.record.status, lifecycle: result.record.lifecycle };
}, 201);

export const createManual = send(async (req) => {
  const record = await service.ingestManual(req);
  return { record, status: record.status, lifecycle: record.lifecycle };
}, 201);

export const review = send((req) => service.reviewRecord(req));

export const remove = send(async (req) => {
  const record = await service.softDeleteRecord(req, req.params.id);
  await auditRequest(req, {
    action: "record_removed",
    resourceType: "record",
    resourceId: record.id,
    patientId: record.patientId,
  });
  return { ok: true, id: record.id };
});

export async function downloadOriginal(req, res, next) {
  try {
    const record = await service.getVisibleRecord(req, req.params.id);
    if (!record.uploadId) return res.status(404).json({ message: "No original file for this record", requestId: req.id });
    const { metadata, buffer } = await readEncrypted(record.uploadId);
    await auditRequest(req, {
      action: "record_downloaded",
      resourceType: "record",
      resourceId: record.id,
      patientId: record.patientId,
      metadata: { filename: metadata.filename, bytes: buffer.length },
    });
    res.setHeader("Content-Type", metadata.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${metadata.filename}"`);
    return res.send(buffer);
  } catch (error) {
    return next(error);
  }
}
