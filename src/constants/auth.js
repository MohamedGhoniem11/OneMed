import { STAFF_ROLES } from "./roles.js";

/**
 * Roles that must enroll and use TOTP MFA (R3, OQ14).
 * Pharmacy is a partner-facing role, not clinical staff, so it is optional.
 */
export const MFA_REQUIRED_ROLES = Object.freeze([
  "doctor",
  "lab_staff",
  "hospital_admin",
  "admin",
]);

export const requiresMfa = (role) => MFA_REQUIRED_ROLES.includes(role);

export const isStaffRole = (role) => STAFF_ROLES.includes(role);

/** Idle timeout is configurable per role group (R3/R65). */
export function idleMinutesForRole(role, env) {
  return isStaffRole(role) ? env.authIdleMinutesStaff : env.authIdleMinutesPatient;
}
