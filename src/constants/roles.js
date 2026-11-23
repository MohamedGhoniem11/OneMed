/**
 * Canonical role set (OQ6). Staff roles are assigned by an administrator; only
 * patients and doctors may self-register through the public endpoint.
 */
export const ROLES = Object.freeze([
  "patient",
  "doctor",
  "lab_staff",
  "pharmacy",
  "hospital_admin",
  "admin",
]);

export const SELF_REGISTER_ROLES = Object.freeze(["patient", "doctor"]);

export const STAFF_ROLES = Object.freeze(["lab_staff", "pharmacy", "hospital_admin", "admin"]);
