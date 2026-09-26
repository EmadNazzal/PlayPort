import cookieParser from 'cookie-parser';
import cors from 'cors';
import { sql } from 'drizzle-orm';
import express, { type Express } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { randomUUID } from 'node:crypto';
import type { Db } from './db/client.js';
import { createAdminRouter, createAdminService } from './modules/admin/index.js';
import { createAuthRouter, createAuthService, createSessionService } from './modules/auth/index.js';
import { createGameRouter, createGameService } from './modules/games/index.js';
import { createGamerRouter, createGamerService } from './modules/gamer/index.js';
import { createPartnerRouter, createPartnerService } from './modules/partner/index.js';
import { createPaymentRouter, createPaymentService, createSolanaGateway, type SolanaGateway } from './modules/payments/index.js';
import { createWalletRouter, createWalletService } from './modules/wallets/index.js';
import { createAuthenticate } from './shared/auth/index.js';
import { config } from './shared/config.js';
import { errorHandler, notFoundHandler } from './shared/http.js';
import { logger } from './shared/logger.js';
import { consoleMailer, type Mailer } from './shared/mailer.js';

export type AppDeps = { db: Db; mailer?: Mailer; solana?: SolanaGateway };

/** Composition root: the only place modules are wired together. */
export const createApp = ({ db, mailer = consoleMailer, solana = createSolanaGateway(config.SOLANA_RPC_URL) }: AppDeps): Express => {
  const sessions = createSessionService(db);
  const auth = createAuthService(db, sessions, mailer);
  const wallets = createWalletService(db, auth);
  const gamers = createGamerService(db);
  const partners = createPartnerService(db);
  const games = createGameService(db);
  const payments = createPaymentService(db, { games, wallets, solana });
  const admin = createAdminService(db, sessions);

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.TRUST_PROXY);
  // bigint (lamports) → decimal string in JSON.
  app.set('json replacer', (_key: string, value: unknown) => (typeof value === 'bigint' ? value.toString() : value));

  app.use(pinoHttp({ logger, genReqId: (req) => (req.headers['x-request-id'] as string | undefined) ?? randomUUID() }));
  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGINS, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: config.NODE_ENV === 'test' ? 100_000 : 300,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
    }),
  );

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.get('/ready', (_req, res, next) => {
    db.execute(sql`select 1`)
      .then(() => res.json({ status: 'ready' }))
      .catch(next);
  });

  app.use(createAuthenticate(db));

  app.use('/auth', createAuthRouter(auth, sessions));
  app.use('/gamers', createGamerRouter(gamers));
  app.use('/wallets', createWalletRouter(wallets));
  app.use('/partners', createPartnerRouter(partners));
  app.use('/games', createGameRouter(games));
  app.use('/payments', createPaymentRouter(payments));
  app.use('/admin', createAdminRouter(admin, partners, games));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};
