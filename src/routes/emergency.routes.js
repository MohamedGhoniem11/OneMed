import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { emergencyLimiter } from "../middleware/rate-limit.js";
import * as c from "../controllers/emergency.controller.js";

const router = Router();

// Patient-only configuration and QR issuance (static paths first).
router.post("/qr", authenticate, c.createQr);
router.patch("/privacy", authenticate, c.privacy);
router.get("/mine", authenticate, c.mine);

// Public surfaces: rate limited, no auth, no clinical data beyond approved fields.
router.get("/:token", emergencyLimiter, c.profile);
router.post("/:token/chat", emergencyLimiter, c.chat);

export default router;
