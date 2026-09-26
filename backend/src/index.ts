import { createApp } from './app.js';
import { db, pool } from './db/client.js';
import { config } from './shared/config.js';
import { logger } from './shared/logger.js';

const server = createApp({ db }).listen(config.PORT, () => {
  logger.info(`PlayPort API listening on http://localhost:${config.PORT}`);
});

const shutdown = (signal: string) => {
  logger.info({ signal }, 'Shutting down');
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => logger.error({ err }, 'Unhandled rejection'));
