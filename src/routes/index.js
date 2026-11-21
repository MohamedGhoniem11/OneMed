import { Router } from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import doctorRoutes from "./doctor.routes.js";
import prescriptionRoutes from "./prescription.routes.js";


const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/doctors", doctorRoutes);
router.use("/prescriptions", prescriptionRoutes);

export default router;

