import { Router } from "express";
import { emergencyLimiter } from "../middleware/rate-limit.js";
import * as c from "../controllers/fulfillment.controller.js";

const router = Router();
// Public bearer-link endpoints; the token itself authorizes the request.
router.get("/:token", emergencyLimiter, c.profile);
router.post("/:token/select", emergencyLimiter, c.select);

export default router;
