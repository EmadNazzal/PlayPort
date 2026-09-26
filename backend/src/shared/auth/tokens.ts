import { jwtVerify, SignJWT } from 'jose';
import { z } from 'zod';
import { config } from '../config.js';
import { ROLES, type Role } from './permissions.js';

const secret = new TextEncoder().encode(config.JWT_SECRET);

const AccessClaims = z.object({
  sub: z.string().uuid(),
  sid: z.string().uuid(),
  /** users.token_version at issue time. */
  ver: z.string().uuid(),
  /** Informational for clients; the server re-reads roles from the database. */
  roles: z.array(z.enum(ROLES)),
});
export type AccessClaims = z.infer<typeof AccessClaims>;

export const signAccessToken = (claims: AccessClaims): Promise<string> =>
  new SignJWT({ sid: claims.sid, ver: claims.ver, roles: claims.roles satisfies Role[] })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.sub)
    .setIssuer(config.JWT_ISSUER)
    .setAudience(config.JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${config.ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(secret);

/** Returns null for any invalid, expired or tampered token. */
export const verifyAccessToken = async (token: string): Promise<AccessClaims | null> => {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: config.JWT_ISSUER,
      audience: config.JWT_AUDIENCE,
      algorithms: ['HS256'],
    });
    const parsed = AccessClaims.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};
