import { Router } from "express";
import { authenticate, requirePermission } from "../middleware/auth.js";
import * as c from "../controllers/analytics.controller.js";

const router = Router();
router.use(authenticate);

router.get("/clinical/:patientId/summary", requirePermission("analytics:read"), c.summary);
router.get("/patient/:patientId", requirePermission("analytics:read"), c.patient);
router.get("/population", requirePermission("analytics:population"), c.population);
router.get("/credits", requirePermission("credits:read"), c.creditBalance);
router.get("/credits/ledger", requirePermission("credits:read"), c.creditLedger);

export default router;
