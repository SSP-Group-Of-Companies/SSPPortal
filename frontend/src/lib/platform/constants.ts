/**
 * Platform-wide enums for the SSP Portal control plane.
 * Keep these in sync with the shared `/api/v1/auth/me` contract consumed by subapps.
 */

export const PORTAL_ROLES = ["member", "admin", "superadmin"] as const;
export type PortalRole = (typeof PORTAL_ROLES)[number];

export const USER_STATUSES = ["active", "disabled"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const APP_STATUSES = ["active", "beta", "coming_soon", "archived"] as const;
export type AppStatus = (typeof APP_STATUSES)[number];

export const ACCESS_REQUEST_STATUSES = ["pending", "approved", "denied"] as const;
export type AccessRequestStatus = (typeof ACCESS_REQUEST_STATUSES)[number];

/** Roles allowed into the portal admin console. */
export const ADMIN_ROLES: PortalRole[] = ["admin", "superadmin"];

export function isAdminRole(role: string | undefined | null): boolean {
  return role === "admin" || role === "superadmin";
}

/** Audit actions — one vocabulary so the audit log stays queryable. */
export const AUDIT_ACTIONS = [
  "user.provisioned",
  "user.signed_in",
  "user.role_changed",
  "user.status_changed",
  "user.apps_changed",
  "user.org_changed",
  "app.created",
  "app.updated",
  "app.archived",
  "company.created",
  "company.updated",
  "department.created",
  "department.updated",
  "access_request.created",
  "access_request.approved",
  "access_request.denied",
  "platform.seeded",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];
