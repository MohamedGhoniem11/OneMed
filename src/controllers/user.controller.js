import * as service from "../services/user.service.js";
import { isValidPhone, normalizePhone } from "../utils/validators.js";
import { httpError } from "../utils/http-error.js";
import { ROLES } from "../constants/roles.js";
import { parseLimit } from "../utils/query.js";
import { appendAudit } from "../services/audit.service.js";
import { revokeUserSessions } from "../services/session.service.js";
import { getStore } from "../store/index.js";

// Only these fields can be changed by the user/admin profile endpoints.
function parseProfile(body) {
  const { name, phone } = body || {};
  const data = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) throw httpError(400, "name is invalid");
    data.name = name.trim();
  }

  if (phone !== undefined) {
    if (!isValidPhone(phone)) throw httpError(400, "phone number is invalid (example: 01012345678)");
    data.phone = normalizePhone(phone);
  }

  if (Object.keys(data).length === 0) {
    throw httpError(400, "nothing to update (allowed: name, phone)");
  }

  return data;
}

const notFound = (req, res) =>
  res.status(404).json({ message: "User not found", requestId: req.id });

/** Never remove or deactivate the last remaining active administrator. */
async function assertNotLastAdmin(user, nextStatus) {
  if (user.role !== "admin" || nextStatus === "active") return;
  const { items } = await getStore().query("users", {
    where: [{ field: "role", op: "==", value: "admin" }, { field: "status", op: "==", value: "active" }],
    limit: 200,
  });
  if (items.length <= 1) throw httpError(409, "The last active administrator cannot be deactivated or deleted");
}

export const me = async (req, res, next) => {
  try {
    const user = await service.getById(req.user.uid);
    user ? res.json(user) : notFound(req, res);
  } catch (e) {
    next(e);
  }
};

export const updateMe = async (req, res, next) => {
  try {
    const user = await service.updateProfile(req.user.uid, parseProfile(req.body));
    user ? res.json(user) : notFound(req, res);
  } catch (e) {
    next(e);
  }
};

export const getAll = async (req, res, next) => {
  try {
    if (req.user.role === "hospital_admin" && !req.user.institutionId) {
      throw httpError(403, "No institution is linked to this account");
    }
    res.json(
      await service.getAll({
        limit: parseLimit(req.query.limit),
        startAfter: req.query.startAfter,
        institutionId: req.user.role === "hospital_admin" ? req.user.institutionId : undefined,
      }),
    );
  } catch (e) {
    next(e);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const user = await service.getById(req.params.id);
    user ? res.json(user) : notFound(req, res);
  } catch (e) {
    next(e);
  }
};

export const updateOne = async (req, res, next) => {
  try {
    const user = await service.updateProfile(req.params.id, parseProfile(req.body));
    user ? res.json(user) : notFound(req, res);
  } catch (e) {
    next(e);
  }
};

export const setRole = async (req, res, next) => {
  try {
    const { role } = req.body || {};
    if (!ROLES.includes(role)) {
      return res.status(400).json({
        message: `role must be one of: ${ROLES.join(", ")}`,
        requestId: req.id,
      });
    }
    const target = await service.getById(req.params.id);
    if (!target) return notFound(req, res);
    if (target.role === "admin" && role !== "admin") await assertNotLastAdmin(target, "inactive");
    if (req.user.institutionId && target.institutionId && target.institutionId !== req.user.institutionId) {
      throw httpError(403, "Cannot manage staff of another institution");
    }
    const user = await service.setRole(req.params.id, role);
    user ? res.json(user) : notFound(req, res);
  } catch (e) {
    next(e);
  }
};

/** Deactivation is the default staff offboarding action: access is revoked but
 * records, prescriptions and audit entries keep their original actor UID. */
export const setStatus = async (req, res, next) => {
  try {
    const status = String(req.body?.status || "");
    if (!["active", "inactive"].includes(status)) throw httpError(400, "status must be active or inactive");
    if (req.params.id === req.user.uid) throw httpError(400, "You cannot change your own account status here");
    const target = await service.getById(req.params.id);
    if (!target) return notFound(req, res);
    if (req.user.institutionId && target.institutionId && target.institutionId !== req.user.institutionId) {
      throw httpError(403, "Cannot manage staff of another institution");
    }
    await assertNotLastAdmin(target, status);
    const updated = await service.updateProfile(req.params.id, { status });
    if (status === "inactive") await revokeUserSessions(req.params.id, "user_deactivated");
    await appendAudit({
      actorId: req.user.uid, actorRole: req.user.role,
      action: status === "inactive" ? "user_deactivated" : "user_activated",
      resourceType: "user", resourceId: req.params.id,
      metadata: { status },
    }).catch((error) => console.error("[audit] user status failed", error));
    res.json(updated);
  } catch (e) {
    next(e);
  }
};

export const remove = async (req, res, next) => {
  try {
    if (req.params.id === req.user.uid) {
      return res.status(400).json({ message: "You cannot delete your own account here", requestId: req.id });
    }
    const target = await service.getById(req.params.id);
    if (!target) return notFound(req, res);
    // Hard delete is an erasure operation, not a routine offboarding action.
    const { items } = await getStore().query("deletionRequests", {
      where: [
        { field: "patientId", op: "==", value: req.params.id },
        { field: "status", op: "==", value: "completed" },
      ],
      limit: 1,
    });
    if (!items.length) throw httpError(409, "Hard delete requires a completed erasure request; deactivate the account instead");
    await assertNotLastAdmin(target, "inactive");
    const removed = await service.remove(req.params.id);
    if (!removed) return notFound(req, res);
    await revokeUserSessions(req.params.id, "user_deleted").catch(() => {});
    await appendAudit({
      actorId: req.user.uid,
      actorRole: req.user.role,
      action: "user_deleted",
      resourceType: "user",
      resourceId: req.params.id,
    }).catch((error) => console.error("[audit] user delete failed", error));
    res.status(204).send();
  } catch (e) {
    next(e);
  }
};
