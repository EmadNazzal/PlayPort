/** Postgres unique_violation, whether raw from pg or wrapped by Drizzle (DrizzleQueryError.cause). */
export const isUniqueViolation = (err: unknown): boolean => {
  for (let e: unknown = err; e && typeof e === 'object'; e = (e as { cause?: unknown }).cause) {
    if ((e as { code?: unknown }).code === '23505') return true;
  }
  return false;
};
