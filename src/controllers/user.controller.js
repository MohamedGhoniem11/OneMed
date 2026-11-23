import * as service from "../services/user.service.js";
import { isValidPhone, normalizePhone } from "../utils/validators.js";
import { httpError } from "../utils/http-error.js";
import { ROLES } from "../constants/roles.js";
import { parseLimit } from "../utils/query.js";

// Only these fields can be changed by the user/admin profile endpoints.
function parseProfile(body) {
  const { name, phone } = body || {};
  const data = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) throw httpError(400, "name is invalid");
    data.name = name.trim();
  }

  if (phone !== undefined) {
    if (!isValidPhone(phone)) throw httpError(400, "phone number is invalid (example: 01012345678)");
    data.phone = normalizePhone(phone);
  }

  if (Object.keys(data).length === 0) {
    throw httpError(400, "nothing to update (allowed: name, phone)");
  }

  return data;
}

const notFound = (req, res) =>
  res.status(404).json({ message: "User not found", requestId: req.id });

export const me = async (req, res, next) => {
  try {
    const user = await service.getById(req.user.uid);
    user ? res.json(user) : notFound(req, res);
  } catch (e) {
    next(e);
  }
};

export const updateMe = async (req, res, next) => {
  try {
    const user = await service.updateProfile(req.user.uid, parseProfile(req.body));
    user ? res.json(user) : notFound(req, res);
  } catch (e) {
    next(e);
  }
};

export const getAll = async (req, res, next) => {
  try {
    res.json(
      await service.getAll({
        limit: parseLimit(req.query.limit),
        startAfter: req.query.startAfter,
      }),
    );
  } catch (e) {
    next(e);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const user = await service.getById(req.params.id);
    user ? res.json(user) : notFound(req, res);
  } catch (e) {
    next(e);
  }
};

export const updateOne = async (req, res, next) => {
  try {
    const user = await service.updateProfile(req.params.id, parseProfile(req.body));
    user ? res.json(user) : notFound(req, res);
  } catch (e) {
    next(e);
  }
};

export const setRole = async (req, res, next) => {
  try {
    const { role } = req.body || {};
    if (!ROLES.includes(role)) {
      return res.status(400).json({
        message: `role must be one of: ${ROLES.join(", ")}`,
        requestId: req.id,
      });
    }
    const user = await service.setRole(req.params.id, role);
    user ? res.json(user) : notFound(req, res);
  } catch (e) {
    next(e);
  }
};

export const remove = async (req, res, next) => {
  try {
    if (req.params.id === req.user.uid) {
      return res.status(400).json({ message: "You cannot delete your own account here", requestId: req.id });
    }
    (await service.remove(req.params.id)) ? res.status(204).send() : notFound(req, res);
  } catch (e) {
    next(e);
  }
};
