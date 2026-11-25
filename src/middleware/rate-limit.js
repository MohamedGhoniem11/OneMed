import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

// Tests remain deterministic via RATE_LIMIT_DISABLED=true in tests/setup.js.
// Do not implicitly disable limiters for NODE_ENV=test: that hides regressions.
const disabled = () => env.rateLimitDisabled;

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
export const emergencyLimiter = rateLimit({ ...base, limit: env.emergencyRateLimitMax });
