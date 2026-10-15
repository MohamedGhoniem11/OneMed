import { Router } from "express";
import * as c from "../controllers/auth.controller.js";

const router = Router();
router.post("/register", c.register);

export default router;
