# Backend TypeScript best practices

## Module structure

Each business area is a module in `backend/src/modules/<name>/`:

| File | Responsibility |
| --- | --- |
| `<name>.types.ts` | Domain types and zod schemas for request payloads |
| `<name>.repository.ts` | Data access only. No business rules. |
| `<name>.service.ts` | Business rules. No HTTP, no `req`/`res`. |
| `<name>.routes.ts` | HTTP: parse input, call the service, map results to status codes |
| `index.ts` | The module's public API — the only file other modules may import |

Rules:
- **No cross-module deep imports.** `import { gamerService } from '../gamer'` is fine;
  `from '../gamer/gamer.repository'` is not. If you need something, export it from `index.ts`.
- **No circular module dependencies.** If two modules need each other, the shared piece
  belongs in `shared/` or in a new module.
- Keep modules independently testable: services receive their repositories, they don't reach
  for globals.

## Types

- `strict: true` is non-negotiable. No `any`; use `unknown` and narrow.
- Validate every external input (HTTP body, query, webhook, env var) at the boundary with
  zod, and derive the type from the schema (`z.infer<typeof Schema>`). Never trust a cast.
- Prefer discriminated unions over optional-field soup:
  `{ status: 'linked'; address: string } | { status: 'unlinked' }`.
- Use branded or clearly named ID types where mixing them up is plausible (`GamerId`, `PartnerId`).
- Return types on exported functions are explicit.

## Errors

- Throw typed errors from `shared/errors.ts` (`NotFoundError`, `ValidationError`,
  `ConflictError`). The error middleware maps them to HTTP status codes — routes don't
  hand-roll `res.status(404)` for domain errors.
- Never swallow errors. If you catch, either handle it fully or rethrow with context.
- Don't leak internals in responses: no stack traces, SQL, or upstream error bodies.

## Async

- Always `await` or return promises; no floating promises (enforced by lint).
- Run independent I/O concurrently with `Promise.all`, not sequential `await`s.
- Set timeouts on every outbound HTTP call — partner APIs are outside our control.

## Security

- Secrets come from env vars, validated once at startup in `shared/config.ts`.
- Store partner API credentials hashed (or encrypted if we must send them back out).
- Wallet ownership is proven by verifying a signed nonce. We never receive, store, or log
  private keys or seed phrases.
- Verify webhook signatures from partners before processing the payload.

## Testing

- Unit-test services with in-memory repositories.
- Test the route layer for status codes and validation, not for business rules again.
- A bug fix comes with a test that fails without the fix.

## Style

- Named exports only. One concept per file.
- Small, pure functions; no hidden side effects in getters or constructors.
- Comments explain *why*, not *what*.
