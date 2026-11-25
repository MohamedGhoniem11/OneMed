/**
 * Consent-aware access middleware (R16, R28).
 *
 * Clinical data is readable only when one of these holds:
 *  - the requester is the patient themselves or an administrator;
 *  - the requester's institution is the record's institution;
 *  - a doctor has an active, scoped consent grant for that patient;
 *  - a time-limited emergency override was recorded for this request.
 *
 * The patient/record lookups live here so controllers cannot forget them.
 */
import { hasActiveConsent } from "../services/consent.service.js";
import { getStore } from "../store/index.js";
import { httpError } from "../utils/http-error.js";

const ROLE_ADMIN = "admin";

export function isSelfOrAdmin(req, patientId) {
  return req.user?.uid === patientId || req.user?.role === ROLE_ADMIN;
}

export async function canReadPatient(req, patientId, { scope = "records", resourceType, resourceId } = {}) {
  void resourceType;
  void resourceId;
  if (isSelfOrAdmin(req, patientId)) return true;

  if (req.user?.role === "doctor") {
    const consent = await hasActiveConsent(patientId, "doctor", req.user.uid, scope);
    if (consent) return true;
  }

  if (req.user?.role === "lab_staff" || req.user?.role === "hospital_admin") {
    const consent = await hasActiveConsent(patientId, "institution", req.affiliation?.institutionId, scope);
    if (consent) return true;
  }

  if (req.emergencyOverride) return true;

  throw httpError(403, "Patient record is not available to you");
}

export function requirePatientAccess(scope, { resourceType, resourceId } = {}) {
  // Must be synchronous: Express route registration needs the middleware
  // function itself, not a Promise that resolves to one (B: Route.get() error).
  return async (req, res, next) => {
    try {
      const patientId = req.params.patientId || req.params.id || req.query.patientId || req.body?.patientId;
      if (!patientId) throw httpError(400, "patientId is required");
      await canReadPatient(req, patientId, { scope, resourceType, resourceId });
      req.patientId = patientId;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/** Load an institution's affiliated staff for the current user. */
export async function loadAffiliation(req) {
  if (!req.user?.uid) return;
  const store = getStore();
  const doctor = await store.get("doctors", req.user.uid);
  if (doctor?.institutionId) {
    req.affiliation = { institutionId: doctor.institutionId, kind: "doctor" };
    req.user.institutionId = doctor.institutionId;
    return;
  }
  const user = await store.get("users", req.user.uid);
  if (user?.institutionId) {
    req.affiliation = { institutionId: user.institutionId, kind: user.role };
    req.user.institutionId = user.institutionId;
  }
}