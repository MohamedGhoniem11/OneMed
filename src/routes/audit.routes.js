import { Router } from "express";
import * as c from "../controllers/audit.controller.js";
import { authenticate, requirePermission } from "../middleware/auth.js";

const router = Router();
router.use(authenticate, requirePermission("audit:read"));
router.get("/", c.list);
router.get("/verify", c.verify);

export default router;