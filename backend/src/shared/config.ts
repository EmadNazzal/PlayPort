import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  DATABASE_URL: z.string().url(),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

  /** Comma-separated list of allowed browser origins. */
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((v) => v.split(',').map((o) => o.trim()).filter(Boolean)),
  /** Put behind a load balancer? Set to the number of proxies so req.ip is the client's. */
  TRUST_PROXY: z.coerce.number().int().nonnegative().default(0),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ISSUER: z.string().default('playport'),
  JWT_AUDIENCE: z.string().default('playport-api'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(15 * 60),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  /** Domain shown in the Sign-In With Solana message; must match the frontend's host. */
  APP_DOMAIN: z.string().default('localhost:5173'),
  APP_URL: z.string().url().default('http://localhost:5173'),

  SOLANA_RPC_URL: z.string().url().default('https://api.devnet.solana.com'),
  PAYMENT_TTL_MINUTES: z.coerce.number().int().positive().default(15),
});

export type Config = z.infer<typeof EnvSchema>;

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config: Config = parsed.data;
export const isProduction = config.NODE_ENV === 'production';
