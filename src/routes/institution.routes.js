import { Router } from "express";
import * as c from "../controllers/institution.controller.js";
import { authenticate, requirePermission } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);
router.get("/", requirePermission("institutions:read"), c.list);
router.get("/:id", requirePermission("institutions:read"), c.get);
router.post("/", requirePermission("institutions:manage"), c.create);
router.patch("/:id/verify", requirePermission("users:manage"), c.verify);

export default router;