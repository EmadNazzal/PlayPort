import { PublicKey } from '@solana/web3.js';
import { z } from 'zod';

/** Reusable zod building blocks. */
export const zId = z.string().uuid();
export const zIdParams = z.object({ id: zId });

export const zEmail = z.string().trim().toLowerCase().email().max(254);

/** NIST 800-63B: length over composition rules. Upper bound stops hash-DoS. */
export const zPassword = z.string().min(10, 'Password must be at least 10 characters').max(128);

export const zUsername = z
  .string()
  .trim()
  .min(3)
  .max(24)
  .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers and underscores');

export const zSlug = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, numbers and single dashes');

export const zHttpsUrl = z
  .string()
  .trim()
  .url()
  .max(2048)
  .refine((u) => u.startsWith('https://'), 'Must be an HTTPS URL');

export const zSolanaAddress = z
  .string()
  .trim()
  .refine((value) => {
    try {
      return new PublicKey(value).toBase58() === value;
    } catch {
      return false;
    }
  }, 'Invalid Solana address');

export const zCountry = z
  .string()
  .length(2)
  .regex(/^[A-Z]{2}$/, 'ISO 3166-1 alpha-2, e.g. IE');

/** Lamports as a decimal string in JSON (bigint-safe); parsed to bigint. */
export const zLamports = z
  .union([z.string().regex(/^\d+$/), z.number().int().nonnegative()])
  .transform((v) => BigInt(v));

export const zPagination = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
