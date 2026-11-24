import { Router } from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import doctorRoutes from "./doctor.routes.js";
import patientRoutes from "./patient.routes.js";
import consentRoutes from "./consent.routes.js";
import institutionRoutes from "./institution.routes.js";
import prescriptionRoutes from "./prescription.routes.js";
import recordRoutes from "./records.routes.js";
import connectRoutes from "./connect.routes.js";
import nfcRoutes from "./nfc.routes.js";
import auditRoutes from "./audit.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/doctors", doctorRoutes);
router.use("/patients", patientRoutes);
router.use("/consents", consentRoutes);
router.use("/institutions", institutionRoutes);
router.use("/prescriptions", prescriptionRoutes);
router.use("/records", recordRoutes);
router.use("/connect", connectRoutes);
router.use("/nfc", nfcRoutes);
router.use("/audit", auditRoutes);

export default router;