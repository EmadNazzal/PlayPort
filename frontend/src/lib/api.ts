import { useSession } from './session';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

type Options = { method?: string; body?: unknown; signal?: AbortSignal; auth?: boolean };

const BASE = '/api';

const raw = async (path: string, { method = 'GET', body, signal }: Options, token: string | null) => {
  const res = await fetch(BASE + path, {
    method,
    signal,
    credentials: 'include',
    headers: {
      ...(body !== undefined && { 'content-type': 'application/json' }),
      ...(token && { authorization: `Bearer ${token}` }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return { res, data: undefined };
  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : undefined;
  return { res, data };
};

const toError = (status: number, data: unknown) => {
  const err = (data as { error?: { message?: string; code?: string; details?: unknown } } | undefined)?.error;
  return new ApiError(err?.message ?? `Request failed (${status})`, status, err?.code ?? 'UNKNOWN', err?.details);
};

let refreshing: Promise<string | null> | null = null;

/**
 * Exchanges the httpOnly refresh cookie for a new access token. Concurrent callers share
 * one request — firing two refreshes at once would trip the server's reuse detection.
 */
export const refreshSession = (): Promise<string | null> => {
  refreshing ??= raw('/auth/refresh', { method: 'POST', body: {} }, null)
    .then(({ res, data }) => {
      const token = res.ok ? (data as { accessToken: string }).accessToken : null;
      useSession.getState().setToken(token);
      return token;
    })
    .catch(() => null)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
};

/** Calls the PlayPort API. Retries once after a silent refresh if the access token expired. */
export const api = async <T>(path: string, opts: Options = {}): Promise<T> => {
  const token = useSession.getState().token;
  let { res, data } = await raw(path, opts, token);

  if (res.status === 401 && token) {
    const fresh = await refreshSession();
    if (fresh) ({ res, data } = await raw(path, opts, fresh));
  }
  if (!res.ok) throw toError(res.status, data);
  return data as T;
};

export const errorMessage = (err: unknown): string =>
  err instanceof ApiError || err instanceof Error ? err.message : 'Something went wrong';
