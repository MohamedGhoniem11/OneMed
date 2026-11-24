import { verifyAccessToken, touchSession } from "../services/session.service.js";
import { loadAffiliation } from "./consent.js";
import { can } from "../constants/permissions.js";

/**
 * Authenticate a OneMed access token and confirm its server-side session is
 * still live. Firebase/local IdP tokens are only exchanged at /api/auth/login;
 * every API call after that uses the 15-minute OneMed token.
 */
export const authenticate = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) {
    return res.status(401).json({ message: "Missing token", requestId: req.id });
  }

  try {
    const decoded = verifyAccessToken(token);
    const session = await touchSession(decoded.sessionId, decoded.uid);
    if (session.role !== decoded.role) {
      return res.status(401).json({ message: "Session role changed; sign in again", requestId: req.id });
    }
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role,
      sessionId: decoded.sessionId,
      mfa: decoded.mfa,
    };
    req.session = session;
    await loadAffiliation(req);
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token", requestId: req.id });
  }
};

export const requireRole =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user?.role)
      ? next()
      : res.status(403).json({ message: "Forbidden", requestId: req.id });

/** Capability-based guard; the matrix lives in constants/permissions.js. */
export const requirePermission =
  (permission) =>
  (req, res, next) =>
    can(req.user?.role, permission)
      ? next()
      : res.status(403).json({ message: "Forbidden", requestId: req.id });
