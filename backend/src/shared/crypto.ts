import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** URL-safe random token with `bytes` bytes of entropy. */
export const randomToken = (bytes = 32): string => randomBytes(bytes).toString('base64url');

/** For high-entropy secrets (refresh tokens, API keys) — a fast hash is sufficient and allows lookup. */
export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

export const safeEqual = (a: string, b: string): boolean => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
};
