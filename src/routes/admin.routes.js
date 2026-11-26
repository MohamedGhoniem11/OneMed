import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { getStore } from "../store/index.js";
import { httpError } from "../utils/http-error.js";
import { auditRequest } from "../services/audit.service.js";
import { revokeUserSessions } from "../services/session.service.js";

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

router.patch("/pharmacies/:id/status", async (req, res, next) => {
  try {
    const status = String(req.body?.status || "");
    if (!["approved", "suspended", "inactive"].includes(status)) throw httpError(400, "Invalid pharmacy status");
    const pharmacy = await getStore().get("pharmacies", req.params.id);
    if (!pharmacy) throw httpError(404, "Pharmacy not found");
    const updated = await getStore().update("pharmacies", pharmacy.id, {
      status, active: status === "approved", updatedAt: new Date(),
    });
    let revoked = 0;
    if (status !== "approved") {
      const { items } = await getStore().query("users", {
        where: [{ field: "institutionId", op: "==", value: pharmacy.id }],
        limit: 200,
      });
      for (const user of items) revoked += await revokeUserSessions(user.uid || user.id, "pharmacy_suspended");
    }
    await auditRequest(req, {
      action: "pharmacy_status_changed", resourceType: "pharmacy", resourceId: pharmacy.id,
      metadata: { status, sessionsRevoked: revoked },
    });
    res.json(updated);
  } catch (error) { next(error); }
});

export default router;
