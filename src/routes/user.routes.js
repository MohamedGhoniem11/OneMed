import { Router } from "express";
import * as c from "../controllers/user.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

// أي مستخدم مسجّل
router.get("/me", authenticate, c.me);
router.patch("/me", authenticate, c.updateMe);

// الأدمن فقط
router.use(authenticate, requireRole("admin"));

router.get("/", c.getAll);
router.route("/:id").get(c.getOne).patch(c.updateOne).delete(c.remove);
router.patch("/:id/role", c.setRole);

export default router;
