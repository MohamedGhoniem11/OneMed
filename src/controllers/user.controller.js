import * as service from "../services/user.service.js";

const ROLES = ["patient", "doctor", "admin"];

// بيرجع الحقول المسموحة فقط، أو error لو فيها غلط
const parseProfile = (body) => {
  const data = {};
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim())
      throw service.httpError(400, "name must be a non-empty string");
    data.name = body.name.trim();
  }
  if (body.phone !== undefined) {
    if (typeof body.phone !== "string" || !/^[0-9+\-\s]{7,20}$/.test(body.phone))
      throw service.httpError(400, "phone is invalid");
    data.phone = body.phone.trim();
  }
  if (Object.keys(data).length === 0)
    throw service.httpError(400, "nothing to update (allowed: name, phone)");
  return data;
};

const notFound = (res) => res.status(404).json({ message: "User not found" });

export const me = async (req, res, next) => {
  try {
    const user = await service.getById(req.user.uid);
    user ? res.json(user) : notFound(res);
  } catch (e) {
    next(e);
  }
};

export const updateMe = async (req, res, next) => {
  try {
    const user = await service.updateProfile(req.user.uid, parseProfile(req.body));
    user ? res.json(user) : notFound(res);
  } catch (e) {
    next(e);
  }
};

export const getAll = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    res.json(await service.getAll({ limit, startAfter: req.query.startAfter }));
  } catch (e) {
    next(e);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const user = await service.getById(req.params.id);
    user ? res.json(user) : notFound(res);
  } catch (e) {
    next(e);
  }
};

export const updateOne = async (req, res, next) => {
  try {
    const user = await service.updateProfile(req.params.id, parseProfile(req.body));
    user ? res.json(user) : notFound(res);
  } catch (e) {
    next(e);
  }
};

export const setRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!ROLES.includes(role))
      return res.status(400).json({ message: `role must be one of: ${ROLES.join(", ")}` });
    const user = await service.setRole(req.params.id, role);
    user ? res.json(user) : notFound(res);
  } catch (e) {
    next(e);
  }
};

export const remove = async (req, res, next) => {
  try {
    if (req.params.id === req.user.uid)
      return res.status(400).json({ message: "You cannot delete your own account here" });
    (await service.remove(req.params.id)) ? res.status(204).send() : notFound(res);
  } catch (e) {
    next(e);
  }
};
