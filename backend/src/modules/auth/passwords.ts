import { hash, verify } from '@node-rs/argon2';

// OWASP-recommended argon2id parameters (m=19 MiB, t=2, p=1).
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const hashPassword = (password: string): Promise<string> => hash(password, OPTIONS);

export const verifyPassword = async (passwordHash: string, password: string): Promise<boolean> => {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
};

/** Verified against when the user doesn't exist, so response time doesn't reveal which emails are registered. */
export const DUMMY_HASH = await hashPassword('playport-timing-equaliser');
