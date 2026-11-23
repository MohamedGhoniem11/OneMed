import { Router } from "express";
import * as c from "../controllers/auth.controller.js";
import { authLimiter } from "../middleware/rate-limit.js";

const router = Router();
router.post("/register", authLimiter, c.register);
router.post("/login", authLimiter, c.login);

export default router;
