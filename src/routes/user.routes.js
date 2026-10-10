import { Router } from "express";
import * as c from "../controllers/user.controller.js";

const router = Router();

router.route("/").get(c.getAll).post(c.create);
router.route("/:id").get(c.getOne).patch(c.update).delete(c.remove);

export default router;
