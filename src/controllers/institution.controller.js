import * as service from "../services/institution.service.js";
import { httpError } from "../utils/http-error.js";
import { validate } from "../utils/schema.js";
import { institutionSchema } from "../schemas/institution.schema.js";
import { auditRequest } from "../services/audit.service.js";

export async function list(req, res, next) {
  try {
    const { type, city, startAfter } = req.query;
    const page = await service.list({
      type,
      city,
      active: req.query.active === "all" ? undefined : req.query.active === undefined ? true : req.query.active === "true",
      limit: req.query.limit,
      startAfter,
    });
    res.json({ institutions: page.items, nextCursor: page.nextCursor });
  } catch (err) {
    next(err);
  }
}

export async function get(req, res, next) {
  try {
    const institution = await service.get(req.params.id);
    if (!institution) throw httpError(404, "Institution not found");
    res.json(institution);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const data = validate(institutionSchema, req.body);
    const institution = await service.create(data);
    await auditRequest(req, {
      action: "institution_created",
      resourceType: "institution",
      resourceId: institution.id,
    });
    res.status(201).json(institution);
  } catch (err) {
    next(err);
  }
}

export async function setActive(req, res, next) {
  try {
    const { active } = req.body || {};
    if (typeof active !== "boolean") throw httpError(400, "active must be true or false");
    const institution = await service.setActive(req.params.id, active);
    await auditRequest(req, {
      action: active ? "institution_activated" : "institution_deactivated",
      resourceType: "institution",
      resourceId: req.params.id,
    });
    res.json(institution);
  } catch (err) {
    next(err);
  }
}

export async function verify(req, res, next) {
  try {
    const { verified } = req.body || {};
    if (typeof verified !== "boolean") throw httpError(400, "verified must be true or false");
    const institution = await service.verify(req.params.id, verified);
    await auditRequest(req, {
      action: verified ? "institution_verified" : "institution_unverified",
      resourceType: "institution",
      resourceId: req.params.id,
    });
    res.json(institution);
  } catch (err) {
    next(err);
  }
}