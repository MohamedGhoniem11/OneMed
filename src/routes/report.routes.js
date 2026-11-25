import { Router } from "express";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { generate } from "../controllers/report.controller.js";

const router = Router();
router.use(authenticate, requirePermission("reports:read"));

// GET /api/reports/:type?patientId=...&format=pdf|csv|json|fhir|text
router.get("/:type", generate);

export default router;
