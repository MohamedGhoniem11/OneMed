import { Router } from "express";
import { authenticate, requirePermission } from "../middleware/auth.js";
import * as c from "../controllers/pharmacy.controller.js";

const router = Router();
router.use(authenticate, requirePermission("pharmacy:orders"));

router.get("/orders", c.ordersList);
router.patch("/orders/:id/status", c.advance);
router.post("/orders/:id/cancel", c.cancel);
router.get("/profile", c.profile);
router.patch("/profile", c.update);
router.get("/nearby", c.nearby);

export default router;
