import { Router } from "express";
import * as c from "../controllers/consent.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

router.get("/", c.listMine);
router.get("/mine", c.listMine);
router.post("/", c.grant);
router.post("/:id/revoke", c.revoke);
router.get("/grantee", c.listForGrantee);

export default router;