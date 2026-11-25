import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { emergencyLimiter } from "../middleware/rate-limit.js";
import * as c from "../controllers/nfc.controller.js";

const router = Router();
// Static paths before the public token resolver.
// Ownership is enforced in the controller; patients may issue their own token.
router.post("/", authenticate, c.issue);
router.get("/mine", authenticate, c.mine);
router.get("/:token", emergencyLimiter, c.resolve);

export default router;
