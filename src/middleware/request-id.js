import crypto from "node:crypto";

const VALID_ID = /^[A-Za-z0-9._-]{1,64}$/;

/**
 * Attach a correlation id to every request. Client-supplied ids are accepted
 * only when they match a safe pattern; otherwise a fresh UUID is generated.
 */
export function requestId(req, res, next) {
  const supplied = req.get("X-Request-Id");
  req.id = supplied && VALID_ID.test(supplied) ? supplied : crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);
  next();
}
