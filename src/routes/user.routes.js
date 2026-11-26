import { Router } from "express";
import * as c from "../controllers/user.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

// أي مستخدم مسجّل
router.get("/me", authenticate, c.me);
router.patch("/me", authenticate, c.updateMe);

// Hospital admins may list their own institution's staff; other user operations
// remain admin-only.
router.get("/", authenticate, requireRole("admin", "hospital_admin"), c.getAll);

router.use(authenticate, requireRole("admin"));
router.route("/:id").get(c.getOne).patch(c.updateOne).delete(c.remove);
router.patch("/:id/status", c.setStatus);
router.patch("/:id/role", c.setRole);

export default router;
