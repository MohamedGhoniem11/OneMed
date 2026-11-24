import * as service from "../services/auth.service.js";
import { validate } from "../utils/schema.js";
import {
  loginSchema,
  mfaEnableSchema,
  mfaSetupSchema,
  mfaVerifyLoginSchema,
  otpVerifySchema,
  registerSchema,
  resendOtpSchema,
} from "../schemas/user.schema.js";
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from "../utils/cookies.js";

const meta = (req) => ({ ip: req.ip ?? "", userAgent: req.get("user-agent") ?? "" });

function sendSession(res, payload) {
  const { refreshToken, ...body } = payload;
  if (refreshToken) setRefreshCookie(res, refreshToken, body.refreshExpiresAt);
  return body;
}

export async function register(req, res, next) {
  try {
    const data = validate(registerSchema, req.body);
    res.status(201).json(await service.register(data));
  } catch (err) {
    next(err);
  }
}

export async function verifyRegistrationOtp(req, res, next) {
  try {
    const data = validate(otpVerifySchema, req.body);
    res.json(await service.verifyRegistrationOtp(data));
  } catch (err) {
    next(err);
  }
}

export async function resendOtp(req, res, next) {
  try {
    const data = validate(resendOtpSchema, req.body);
    res.json(await service.resendRegistrationOtp(data));
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const data = validate(loginSchema, req.body);
    res.json(sendSession(res, await service.login(data, meta(req))));
  } catch (err) {
    next(err);
  }
}

export async function verifyMfa(req, res, next) {
  try {
    const data = validate(mfaVerifyLoginSchema, req.body);
    res.json(sendSession(res, await service.verifyLoginMfa(data, meta(req))));
  } catch (err) {
    next(err);
  }
}

export async function setupMfa(req, res, next) {
  try {
    const data = validate(mfaSetupSchema, req.body);
    res.json(await service.beginMfaSetup(data));
  } catch (err) {
    next(err);
  }
}

export async function enableMfa(req, res, next) {
  try {
    const data = validate(mfaEnableSchema, req.body);
    res.json(await service.enableMfa(data));
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const token = readRefreshCookie(req);
    const payload = await service.refreshSessionForRequest(token, meta(req));
    const { refreshToken, ...body } = payload;
    setRefreshCookie(res, refreshToken, body.refreshExpiresAt);
    res.json(body);
  } catch (err) {
    clearRefreshCookie(res);
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    await service.logoutByRefreshToken(readRefreshCookie(req), meta(req));
    clearRefreshCookie(res);
    res.json({ loggedOut: true });
  } catch (err) {
    clearRefreshCookie(res);
    next(err);
  }
}
