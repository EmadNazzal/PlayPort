# Backend TypeScript best practices

## Module structure

Each business area is a module in `backend/src/modules/<name>/`:

| File | Responsibility |
| --- | --- |
| `<name>.service.ts` | Business rules and data access (Drizzle). No `req`/`res`. |
| `<name>.routes.ts` | HTTP: zod schemas, guards, call the service, pick status codes |
| `<name>.policy.ts` | (optional) resource-scoped authorization, e.g. `assertPartnerAccess` |
| `index.ts` | The module's public API — the only file other modules may import |
| `README.md` | What the module owns and its endpoints |

Database tables live in `src/db/schema/`, one file per domain. The schema is shared
infrastructure; module boundaries apply to services, not tables.

Rules:
- **No cross-module deep imports.** `import { assertPartnerAccess } from '../partner/index.js'`
  is fine; `from '../partner/partner.policy.js'` is not.
- **No circular module dependencies.** Shared pieces go in `shared/`.
- Services are factories that receive their dependencies (`createGameService(db)`); they are
  wired together only in `src/app.ts`.
- Extract a repository layer only when the same queries are reused across services.

## Routes

Use `handler({ body, query, params }, fn)` from `shared/http.ts`: it parses input with zod and
hands the handler typed, stripped data. Never read `req.body` directly.

```ts
router.patch('/:id', requireAuth, requirePermission('games:manage'),
  handler({ params: zIdParams, body: UpdateSchema }, async ({ params, body }, req, res) => {
    res.json(await games.update(getPrincipal(req), params.id, body));
  }));
```

Reusable zod pieces (`zEmail`, `zPassword`, `zHttpsUrl`, `zSolanaAddress`, `zLamports`,
`zPagination`, ...) live in `shared/validation.ts` — use them instead of re-inventing rules.

## Authorization

Two layers, both required:
1. **Route guard** — `requireUser` / `requireAuth` + `requirePermission('x:y')`. Check
   permissions, never role names. New capability → add it to `shared/auth/permissions.ts`
   and grant it to roles.
2. **Resource check in the service** — "may *this* caller touch *this* row?" For anything
   owned by a partner, call `assertPartnerAccess(db, principal, partnerId, minRole)`.
   Return 404 (not 403) to outsiders so IDs can't be probed.

Services take the `Principal` (not just a user ID) when API keys may call them.
Write an `audit()` entry for security-relevant and admin actions, inside the same transaction.

## Types

- `strict: true` is non-negotiable. No `any`; use `unknown` and narrow.
- Validate every external input (HTTP body, query, webhook, env var) at the boundary with
  zod, and derive the type from the schema (`z.infer<typeof Schema>`). Never trust a cast.
- Prefer discriminated unions over optional-field soup:
  `{ status: 'linked'; address: string } | { status: 'unlinked' }`.
- Use branded or clearly named ID types where mixing them up is plausible (`GamerId`, `PartnerId`).
- Return types on exported functions are explicit.

## Errors

- Throw typed errors from `shared/errors.ts` (`ValidationError`, `UnauthorizedError`,
  `ForbiddenError`, `NotFoundError`, `ConflictError`). The error middleware maps them to HTTP status codes — routes don't
  hand-roll `res.status(404)` for domain errors.
- Never swallow errors. If you catch, either handle it fully or rethrow with context.
- Don't leak internals in responses: no stack traces, SQL, or upstream error bodies.

## Async

- Always `await` or return promises; no floating promises (enforced by lint).
- Run independent I/O concurrently with `Promise.all`, not sequential `await`s.
- Set timeouts on every outbound HTTP call — partner APIs are outside our control.

## Security

- Secrets come from env vars, validated once at startup in `shared/config.ts`.
- Store tokens and API keys hashed (sha256 for high-entropy secrets, argon2id for passwords).
- Money is `bigint` lamports end to end — never `number`, never floats.
- Wallet ownership is proven by verifying a signed nonce. We never receive, store, or log
  private keys or seed phrases.
- Verify webhook signatures from partners before processing the payload.

## Testing

- Integration-test through HTTP against a real Postgres (`npm test`; see `backend/test/`).
  Stub only true externals (Solana RPC, mail) via the deps passed to `createApp`.
- Every authorization rule gets a test proving the *wrong* caller is refused.
- A bug fix comes with a test that fails without the fix.

## Style

- Named exports only. One concept per file.
- Small, pure functions; no hidden side effects in getters or constructors.
- Comments explain *why*, not *what*.
