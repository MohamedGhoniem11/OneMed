import * as service from "../services/doctor.service.js";
import { httpError } from "../utils/http-error.js";
import { parseLimit } from "../utils/query.js";
import { validate } from "../utils/schema.js";
import { doctorSchema } from "../schemas/doctor.schema.js";

const withoutPrivate = ({ licenseNumber, ...rest }) => rest;

export async function getMe(req, res, next) {
  try {
    res.json(await service.getProfile(req.user.uid));
  } catch (err) {
    next(err);
  }
}

export async function saveMe(req, res, next) {
  try {
    const data = validate(doctorSchema, req.body);
    res.json(await service.saveProfile(req.user.uid, data));
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req, res, next) {
  try {
    const data = validate(doctorSchema, req.body, { partial: true });
    if (Object.keys(data).length === 0) throw httpError(400, "nothing to update");
    res.json(await service.updateProfile(req.user.uid, data));
  } catch (err) {
    next(err);
  }
}

export async function getAll(req, res, next) {
  try {
    const { specialty, city, startAfter } = req.query;
    const limit = parseLimit(req.query.limit);
    const isAdmin = req.user.role === "admin";

    let verified = true;
    if (isAdmin) {
      verified = req.query.verified === undefined ? undefined : req.query.verified === "true";
    }

    const result = await service.list({ specialty, city, verified, limit, startAfter });

    if (!isAdmin) {
      result.doctors = result.doctors.map((doctor) =>
        doctor.id === req.user.uid ? doctor : withoutPrivate(doctor),
      );
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getOne(req, res, next) {
  try {
    const doctor = await service.getOne(req.params.id);
    const isOwner = req.user.uid === req.params.id;
    const isAdmin = req.user.role === "admin";

    if (!doctor.verified && !isAdmin && !isOwner) throw httpError(404, "Doctor not found");

    res.json(isAdmin || isOwner ? doctor : withoutPrivate(doctor));
  } catch (err) {
    next(err);
  }
}

export async function setVerified(req, res, next) {
  try {
    const { verified } = req.body || {};
    if (typeof verified !== "boolean") throw httpError(400, "verified must be true or false");
    res.json(await service.setVerified(req.params.id, verified));
  } catch (err) {
    next(err);
  }
}
