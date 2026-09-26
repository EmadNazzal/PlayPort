import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
});

export const config = EnvSchema.parse(process.env);
