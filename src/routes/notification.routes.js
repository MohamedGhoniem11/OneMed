import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import * as c from "../controllers/notification.controller.js";

const router = Router();
router.use(authenticate);

router.post("/device-token", c.registerDevice);
router.get("/", c.list);
router.post("/read-all", c.markAll);
router.post("/:id/read", c.markOne);

export default router;
