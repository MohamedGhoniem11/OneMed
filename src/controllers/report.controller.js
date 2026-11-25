import { buildReport } from "../services/report.service.js";
import { httpError } from "../utils/http-error.js";

export async function generate(req, res, next) {
  try {
    const type = req.params.type || req.query.type;
    if (type === "population" && !["hospital_admin", "admin"].includes(req.user?.role)) {
      throw httpError(403, "Population reports are limited to hospital administrators");
    }
    const { format = "pdf" } = req.query;
    const report = await buildReport(req, type, {
      patientId: req.query.patientId || req.params.patientId,
      institutionId: req.query.institutionId,
      format,
    });
    res.set("Content-Type", report.contentType);
    res.set("Content-Disposition", `attachment; filename="${report.filename}"`);
    res.set("X-Content-Type-Options", "nosniff");
    res.send(report.body);
  } catch (error) {
    next(error);
  }
}
