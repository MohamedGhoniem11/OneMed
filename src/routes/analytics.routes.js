import { Router } from "express";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { requirePatientAccess } from "../middleware/consent.js";
import { emergencyLimiter } from "../middleware/rate-limit.js";
import * as c from "../controllers/analytics.controller.js";

const router = Router();
router.use(authenticate);

router.post("/clinical/:patientId/chat", requirePermission("analytics:read"), requirePatientAccess("records"), emergencyLimiter, c.chat);
router.get("/clinical/:patientId/summary", requirePermission("analytics:read"), c.summary);
router.get("/patient/:patientId", requirePermission("analytics:read"), c.patient);
router.get("/population", requirePermission("analytics:population"), c.population);
router.get("/credits", requirePermission("credits:read"), c.creditBalance);
router.get("/credits/ledger", requirePermission("credits:read"), c.creditLedger);

export default router;
