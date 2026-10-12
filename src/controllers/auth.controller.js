import * as service from "../services/auth.service.js";

const SELF_ROLES = ["patient", "doctor"]; // الأدمن بيتعمل يدوي بس

export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!name || !email || !password || !role)
      return res.status(400).json({ message: "name, email, password and role are required" });
    if (!SELF_ROLES.includes(role))
      return res.status(400).json({ message: `role must be one of: ${SELF_ROLES.join(", ")}` });
    if (password.length < 6)
      return res.status(400).json({ message: "password must be at least 6 characters" });

    const user = await service.register({ name, email, password, phone, role });
    res.status(201).json(user);
  } catch (e) {
    next(e);
  }
};
