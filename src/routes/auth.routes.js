import { Router } from "express";
import * as c from "../controllers/auth.controller.js";
import * as s from "../controllers/staff.controller.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rate-limit.js";

const router = Router();
router.post("/register", authLimiter, c.register);
router.post("/register/verify-otp", authLimiter, c.verifyRegistrationOtp);
router.post("/register/resend-otp", authLimiter, c.resendOtp);
router.post("/login", authLimiter, c.login);
router.post("/mfa/verify", authLimiter, c.verifyMfa);
router.post("/mfa/setup", authLimiter, c.setupMfa);
router.post("/mfa/enable", authLimiter, c.enableMfa);
router.post("/refresh", authLimiter, c.refresh);
router.post("/logout", c.logout);

// Admin-only staff provisioning. The new user finishes with their own OTP.
router.post("/staff", authenticate, requirePermission("users:manage"), authLimiter, s.create);
router.post("/staff/verify-otp", authLimiter, s.verifyOtp);

export default router;