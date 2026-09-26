import type { Permission, Role } from './permissions.js';

/** A signed-in person, authenticated by an access token. */
export type UserPrincipal = {
  kind: 'user';
  userId: string;
  sessionId: string;
  roles: readonly Role[];
  permissions: ReadonlySet<Permission>;
};

/** A partner's backend, authenticated by an API key. */
export type ApiKeyPrincipal = {
  kind: 'api_key';
  partnerId: string;
  keyId: string;
  permissions: ReadonlySet<Permission>;
};

export type Principal = UserPrincipal | ApiKeyPrincipal;

export const isAdmin = (p: Principal): boolean => p.kind === 'user' && p.roles.includes('admin');

declare module 'express-serve-static-core' {
  interface Request {
    principal?: Principal;
  }
}
