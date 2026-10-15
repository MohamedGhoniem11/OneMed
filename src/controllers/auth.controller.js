import * as service from "../services/auth.service.js";
import { isValidPhone, normalizePhone } from "../utils/validators.js";

export async function register(req, res, next) {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password || !role)
      return res.status(400).json({ error: "name, email, password, role are required" });
    if (password.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    if (!["patient", "doctor"].includes(role))
      return res.status(400).json({ error: "role must be patient or doctor" });
    if (phone && !isValidPhone(phone))
      return res.status(400).json({ error: "رقم الموبايل غير صالح (مثال: 01012345678)" });

    const result = await service.register({
      name, email, password, role,
      phone: phone ? normalizePhone(phone) : "",
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}