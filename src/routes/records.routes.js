import { Router } from "express";
import { authenticate, requirePermission, requireVerifiedDoctor } from "../middleware/auth.js";
import { requirePatientAccess } from "../middleware/consent.js";
import { upload } from "../middleware/upload.js";
import * as c from "../controllers/records.controller.js";

const router = Router();
router.use(authenticate);

// Static paths first: Express matches in declaration order.
router.get("/pending", requirePermission("records:write"), c.pending);
router.post("/manual", requirePermission("records:write"), requireVerifiedDoctor, requirePatientAccess("records"), c.createManual);
// Multer must parse the multipart body before consent middleware can read patientId.
router.post("/ingest", requirePermission("records:write"), requireVerifiedDoctor, upload.single("file"), requirePatientAccess("records"), c.ingestFile);

router.get("/", requirePermission("records:read"), c.list);
router.get("/:id", requirePermission("records:read"), c.getOne);
router.get("/:id/original", requirePermission("records:read"), c.downloadOriginal);
router.patch("/:id/review", requirePermission("records:write"), c.review);
// Archive/restore: documented lifecycle states, restricted to records writers
// with patient consent. Patients cannot modify clinical records.
router.post("/:id/archive", requirePermission("records:write"), c.archive);
router.post("/:id/restore", requirePermission("records:write"), c.restore);

export default router;
