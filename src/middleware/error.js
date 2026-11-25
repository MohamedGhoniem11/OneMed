/**
 * Central error handler.
 *
 * - 4xx errors keep their actionable message (validation, auth, RBAC, ...).
 * - 5xx errors are logged with the request id and returned as a generic message,
 *   so internal details (tokens, stack traces, provider errors) never leak.
 */
const redact = (value) => String(value || "")
  .replace(/([\w-]*(?:token|code|secret|password|otp)[\w-]*=)[^&\s]+/gi, "$1[redacted]")
  .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted-token]");

export const notFound = (req, res) =>
  res.status(404).json({
    message: `Route ${req.method} ${redact(req.originalUrl)} not found`,
    requestId: req.id,
  });

export function errorHandler(err, req, res, next) {
  let status =
    Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
  let message = err.message || "Internal Server Error";

  if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Invalid JSON body";
  } else if (err.name === "MulterError") {
    status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    message =
      err.code === "LIMIT_FILE_SIZE" ? "Uploaded file is too large" : `Upload error: ${err.message}`;
  }

  if (status >= 500) {
    console.error(`[${req.id}] ${req.method} ${redact(req.originalUrl)}`, err);
    message = "Internal Server Error";
  }

  if (res.headersSent) return next(err);
  res.status(status).json({ message, requestId: req.id });
}
