import { getIdp } from "../auth/index.js";

export const authenticate = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) {
    return res.status(401).json({ message: "Missing token", requestId: req.id });
  }

  try {
    const decoded = await getIdp().verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email, role: decoded.role };
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
