import { Router } from "express";
import { authenticate, requirePermission } from "../middleware/auth.js";
import * as c from "../controllers/nfc.controller.js";

const router = Router();
// Static paths before the public token resolver.
router.post("/", authenticate, requirePermission("patients:read"), c.issue);
router.get("/mine", authenticate, c.mine);
router.get("/:token", c.resolve);

export default router;
