import { Router } from "express";
import { authenticate, requirePermission, requireRole } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { ocrLimiter } from "../middleware/rate-limit.js";
import * as c from "../controllers/prescription.controller.js";

const router = Router();
router.use(authenticate);

router.post("/extract", requireRole("doctor"), ocrLimiter, upload.single("image"), c.extract);
router.post("/", requirePermission("prescriptions:write"), c.create);
router.post("/:id/confirm", requirePermission("prescriptions:write"), c.confirm);
router.get("/", requireRole("doctor", "admin", "patient"), c.list);
router.get("/patient/:patientId", requirePermission("prescriptions:read"), c.listForPatient);
router.get("/:id", requireRole("doctor", "admin", "patient"), c.getOne);

export default router;
