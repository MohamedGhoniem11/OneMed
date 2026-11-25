/**
 * Action-based RBAC. Routes ask for a capability, never for a hardcoded list of
 * roles, so the matrix can be audited and tested in one place (R4/R81).
 */
export const PERMISSIONS = Object.freeze({
  "users:read": ["admin"],
  "users:manage": ["admin"],
  "doctors:verify": ["admin"],
  "audit:read": ["admin"],
  "institutions:read": ["patient", "doctor", "lab_staff", "pharmacy", "hospital_admin", "admin"],
  "institutions:manage": ["admin", "hospital_admin"],
  "patients:self": ["patient"],
  "patients:read": ["doctor", "lab_staff", "hospital_admin", "admin"],
  "patients:write": ["patient", "admin"],
  "records:write": ["doctor", "lab_staff", "hospital_admin", "admin"],
  "records:read": ["doctor", "lab_staff", "hospital_admin", "admin", "patient"],
  "prescriptions:write": ["doctor"],
  "prescriptions:read": ["doctor", "admin", "patient"],
  "consents:grant": ["patient"],
  "consents:read": ["patient", "doctor", "admin"],
  "consents:revoke": ["patient", "admin"],
  "pharmacy:orders": ["pharmacy", "admin"],
  "reports:read": ["patient", "doctor", "hospital_admin", "admin"],
  "analytics:read": ["patient", "doctor", "hospital_admin", "admin"],
  "analytics:population": ["hospital_admin", "admin"],
  "credits:read": ["doctor", "lab_staff", "hospital_admin", "admin"],
});

export function can(role, permission) {
  return Boolean(PERMISSIONS[permission]?.includes(role));
}
