import { Router } from "express";
import { emergencyLimiter } from "../middleware/rate-limit.js";
import { getStore } from "../store/index.js";
import { httpError } from "../utils/http-error.js";
import { auditRequest } from "../services/audit.service.js";

const router = Router();

// Available to any bystander without login: R22 requires a Report Issue action
// on every AI response, including the public emergency chatbot.
router.post("/report-issue", emergencyLimiter, async (req, res, next) => {
  try {
    const { kind = "ai", message = "", source = "" } = req.body || {};
    if (!String(message).trim()) throw httpError(400, "A description is required");
    const entry = await getStore().add("aiIssues", {
      kind: String(kind).slice(0, 40),
      message: String(message).slice(0, 2000),
      source: String(source).slice(0, 200),
      reportedBy: req.user?.uid || null,
      createdAt: new Date(),
    });
    await auditRequest(req, { action: "ai_issue_reported", resourceType: "ai", resourceId: entry.id, metadata: { kind, source } });
    res.status(201).json({ id: entry.id });
  } catch (error) { next(error); }
});

export default router;
