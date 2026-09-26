/**
 * Authorization model
 * -------------------
 * 1. Global roles (admin, gamer, partner) map to permissions here, in code — reviewed in PRs,
 *    no drift between environments. Add a permission, then grant it to roles.
 * 2. Resource-scoped checks (is this user a member of *this* partner?) are done by policy
 *    functions in the owning module (see partner module's `assertPartnerAccess`).
 * 3. Partner API keys carry explicit scopes, a subset of partner permissions.
 *
 * Route guards check permissions, never role names.
 */
export const PERMISSIONS = [
  // any signed-in user
  'profile:write',
  'partners:apply',
  // gamers
  'wallets:manage',
  'payments:create',
  'games:claim',
  // partner members (still subject to per-partner membership checks)
  'partners:manage',
  'games:manage',
  'payments:read_partner',
  // admins
  'admin:users:read',
  'admin:users:write',
  'admin:roles:write',
  'admin:partners:review',
  'admin:games:review',
  'admin:audit:read',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLES = ['admin', 'gamer', 'partner'] as const;
export type Role = (typeof ROLES)[number];

const BASE: Permission[] = ['profile:write', 'partners:apply'];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  gamer: [...BASE, 'wallets:manage', 'payments:create', 'games:claim'],
  partner: [...BASE, 'wallets:manage', 'partners:manage', 'games:manage', 'payments:read_partner'],
  admin: PERMISSIONS,
};

/** Scopes a partner API key may be granted. */
export const API_KEY_SCOPES = ['games:manage', 'payments:read_partner'] as const satisfies readonly Permission[];
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export const permissionsForRoles = (roles: readonly Role[]): ReadonlySet<Permission> =>
  new Set([...BASE, ...roles.flatMap((r) => ROLE_PERMISSIONS[r])]);
