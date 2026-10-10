import * as service from "../services/user.service.js";

const pick = ({ name, email, age }) => {
  const out = { name, email, age };
  Object.keys(out).forEach((k) => out[k] === undefined && delete out[k]);
  return out;
};

export const create = async (req, res, next) => {
  try {
    const data = pick(req.body);
    if (!data.name || !data.email) {
      return res.status(400).json({ message: "name and email are required" });
    }
    res.status(201).json(await service.create(data));
  } catch (e) {
    next(e);
  }
};

export const getAll = async (req, res, next) => {
  try {
    res.json(await service.getAll());
  } catch (e) {
    next(e);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const user = await service.getById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (e) {
    next(e);
  }
};

export const update = async (req, res, next) => {
  try {
    const user = await service.update(req.params.id, pick(req.body));
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (e) {
    next(e);
  }
};

export const remove = async (req, res, next) => {
  try {
    const ok = await service.remove(req.params.id);
    if (!ok) return res.status(404).json({ message: "User not found" });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
};
