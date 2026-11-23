import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

const disabled = () => env.rateLimitDisabled || env.isTest;

const base = {
  windowMs: env.rateLimitWindowMs,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: disabled,
  handler: (req, res) =>
    res.status(429).json({
      message: "Too many requests, please try again later.",
      requestId: req.id,
    }),
};

export const globalLimiter = rateLimit({ ...base, limit: env.rateLimitMax });
export const authLimiter = rateLimit({ ...base, limit: env.authRateLimitMax });
export const ocrLimiter = rateLimit({ ...base, limit: env.ocrRateLimitMax });
export const aiLimiter = rateLimit({ ...base, limit: env.aiRateLimitMax });
