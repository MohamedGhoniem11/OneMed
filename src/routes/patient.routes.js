import { Router } from "express";
import * as c from "../controllers/patient.controller.js";
import { authenticate, requirePermission, requireRole } from "../middleware/auth.js";
import { requirePatientAccess } from "../middleware/consent.js";

const router = Router();
router.use(authenticate);

router.get("/me", c.me);
router.post("/:id/deletion", c.requestDeletion);
router.patch("/me", c.updatePatientMe);
router.get("/search", requirePermission("patients:read"), c.search);
// Self-access is allowed here; consent/ownership is enforced in the controller.
router.get("/:id", c.getById);
router.post(
  "/:id/emergency-override",
  requirePermission("patients:read"),
  requireRole("doctor"),
  c.override,
);
router.get("/:id/records", requirePermission("patients:read"), requirePatientAccess("records"), c.records);
router.get(
  "/:id/prescriptions",
  requirePermission("prescriptions:read"),
  requirePatientAccess("prescriptions"),
  c.prescriptions,
);

export default router;