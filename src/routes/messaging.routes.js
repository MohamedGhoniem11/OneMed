import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import * as c from "../controllers/messaging.controller.js";

const router = Router();
router.use(authenticate);

router.get("/conversations", c.listConversations);
router.post("/conversations", c.createConversation);
router.get("/conversations/:id/messages", c.listMessages);
router.post("/conversations/:id/messages", c.sendMessage);

export default router;
