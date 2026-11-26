import { appendAudit } from "../services/audit.service.js";

/**
 * Generic write audit for all mutating API requests.
 *
 * The router-level controllers do not need to opt in per route: any
 * non-GET request that completes with < 500 is appended to the hash chain.
 * Auth-specific events (register, login, MFA, logout) are already logged with
 * more context by the auth service.
 */
export default async function auditMiddleware(req, res, next) {
  res.on("finish", () => {
    if (req.method === "OPTIONS" || req.method === "HEAD") return;
    if (req.path === "/" || req.path === "/health") return;
    if (res.statusCode >= 500) return;
    if (req.path.startsWith("/auth")) return; // richer auth-service audit

    const action = `${req.method.toLowerCase()}_${req.baseUrl}${req.path}`
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/_+/g, "_")
      .slice(0, 80)
      .toLowerCase();

    const entry = {
      actorId: req.user?.uid ?? null,
      actorRole: req.user?.role ?? null,
      action,
      resourceType: req.baseUrl.replace(/^\/api\//, "") || "api",
      resourceId: req.params?.id ?? req.params?.patientId ?? null,
      patientId: req.body?.patientId ?? req.query?.patientId ?? req.params?.patientId
        ?? req.originalUrl?.match(/^\/api\/patients\/([^/?]+)/)?.[1]
        ?? null,
      ip: req.ip ?? "",
      userAgent: req.get("user-agent") ?? "",
      metadata: {
        method: req.method,
        // Never persist raw bearer tokens: use the route pattern when available.
        path: `${req.baseUrl || ""}${req.route?.path || req.path || ""}`
          .replace(/\?.*$/, "")
          .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted-token]"),
        status: res.statusCode,
      },
    };
    appendAudit(entry).catch((error) => console.error("[audit] response audit failed", error));
  });
  next();
}