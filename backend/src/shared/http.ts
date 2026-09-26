import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import { z, ZodError, type ZodTypeAny } from 'zod';
import { AppError, NotFoundError } from './errors.js';
import { logger } from './logger.js';

/** Forwards rejected promises from async handlers to the error middleware. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

type Schemas = { body?: ZodTypeAny; query?: ZodTypeAny; params?: ZodTypeAny };
type Parsed<S extends Schemas> = {
  body: S['body'] extends ZodTypeAny ? z.infer<S['body']> : undefined;
  query: S['query'] extends ZodTypeAny ? z.infer<S['query']> : undefined;
  params: S['params'] extends ZodTypeAny ? z.infer<S['params']> : undefined;
};

/**
 * Declares a route's input schemas and hands the handler fully parsed, typed input.
 * Unknown body keys are stripped by zod, so handlers never see unvalidated fields.
 */
export const handler =
  <S extends Schemas>(
    schemas: S,
    fn: (input: Parsed<S>, req: Request, res: Response) => Promise<unknown>,
  ): RequestHandler =>
  (req, res, next) => {
    const input = {
      body: schemas.body?.parse(req.body),
      query: schemas.query?.parse(req.query),
      params: schemas.params?.parse(req.params),
    } as Parsed<S>;
    fn(input, req, res).catch(next);
  };

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: err.flatten() } });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  // body-parser errors (malformed JSON, payload too large) carry a status.
  if (typeof err === 'object' && err && 'status' in err && typeof err.status === 'number' && err.status < 500) {
    res.status(err.status).json({ error: { code: 'BAD_REQUEST', message: 'Malformed request' } });
    return;
  }
  logger.error({ err, reqId: req.id }, 'Unhandled error');
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal server error' } });
};
