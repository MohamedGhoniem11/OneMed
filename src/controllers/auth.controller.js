import * as service from "../services/auth.service.js";
import { validate } from "../utils/schema.js";
import { loginSchema, registerSchema } from "../schemas/user.schema.js";

export async function register(req, res, next) {
  try {
    const data = validate(registerSchema, req.body);
    res.status(201).json(await service.register(data));
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = validate(loginSchema, req.body);
    res.json(await service.login({ email, password }));
  } catch (err) {
    next(err);
  }
}
