import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import * as c from "../controllers/doctor.controller.js";

const router = Router();
router.use(authenticate);

// بروفايلي (دكتور)
router.get("/me", requireRole("doctor"), c.getMe);
router.put("/me", requireRole("doctor"), c.saveMe);
router.patch("/me", requireRole("doctor"), c.updateMe);

// للجميع (لازم يكونوا مسجّلين دخول)
router.get("/", c.getAll);
router.get("/:id", c.getOne);

// أدمن
router.patch("/:id/verify", requireRole("admin"), c.setVerified);

export default router;