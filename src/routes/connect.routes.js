import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import * as c from "../controllers/connect.controller.js";

const router = Router();
// QR creation is doctor-only; resolving a scanned QR is public (no clinical data).
router.post("/qr", authenticate, requireRole("doctor"), c.createQr);
router.get("/:token", c.resolve);
router.post("/:token/accept", authenticate, requireRole("patient"), c.accept);

export default router;
