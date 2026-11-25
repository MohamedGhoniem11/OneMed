import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { getStore } from "../store/index.js";
import { httpError } from "../utils/http-error.js";
import { auditRequest } from "../services/audit.service.js";

const router = Router();
router.use(authenticate, requireRole("admin"));

router.get("/pharmacies", async (req, res, next) => {
  try {
    const { items } = await getStore().query("pharmacies", { limit: 500 });
    res.json({ pharmacies: items });
  } catch (error) { next(error); }
});

router.patch("/pharmacies/:id/approve", async (req, res, next) => {
  try {
    const pharmacy = await getStore().get("pharmacies", req.params.id);
    if (!pharmacy) throw httpError(404, "Pharmacy not found");
    const updated = await getStore().update("pharmacies", pharmacy.id, { status: "approved", active: true, updatedAt: new Date() });
    await auditRequest(req, { action: "pharmacy_approved", resourceType: "pharmacy", resourceId: pharmacy.id });
    res.json(updated);
  } catch (error) { next(error); }
});

export default router;
