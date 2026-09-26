import express, { type Express } from 'express';
import { errorHandler } from './shared/http.js';

/** Composition root: the only place modules are wired together. */
export const createApp = (): Express => {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(errorHandler);
  return app;
};
