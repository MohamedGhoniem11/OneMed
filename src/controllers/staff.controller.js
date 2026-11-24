import * as service from "../services/staff.service.js";
import { validate } from "../utils/schema.js";
import { otpVerifySchema, staffCreateSchema } from "../schemas/user.schema.js";

export async function create(req, res, next) {
  try {
    const data = validate(staffCreateSchema, req.body);
    const result = await service.createStaffAccount(data, req.user, {
      ip: req.ip ?? "",
      userAgent: req.get("user-agent") ?? "",
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function verifyOtp(req, res, next) {
  try {
    const data = validate(otpVerifySchema, req.body);
    res.json(
      await service.verifyStaffOtp(data, req.user ?? {}, {
        ip: req.ip ?? "",
        userAgent: req.get("user-agent") ?? "",
      }),
    );
  } catch (err) {
    next(err);
  }
}