import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { ocrLimiter } from "../middleware/rate-limit.js";
import * as c from "../controllers/prescription.controller.js";

const router = Router();
router.use(authenticate);

router.post("/extract", requireRole("doctor"), ocrLimiter, upload.single("image"), c.extract);
router.post("/", requireRole("doctor"), c.create);
router.get("/", requireRole("doctor", "admin"), c.list);
router.get("/:id", requireRole("doctor", "admin"), c.getOne);

export default router;
