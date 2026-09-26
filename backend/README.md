# PlayPort backend

Express + TypeScript + Postgres (Drizzle). Read [the backend guide](../docs/best-practices/backend-typescript.md) before contributing.

## Setup

```bash
cp .env.example .env          # then set JWT_SECRET: openssl rand -base64 48
npm install
npm run db:up                 # Postgres 16 in Docker on :5433
npm run db:migrate
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-passphrase' npm run create-admin
npm run db:seed               # optional: reset + mock users, partners, games, payments
npm run dev                   # http://localhost:4000
npm test                      # integration tests against a throwaway playport_test DB
```

Schema changes: edit `src/db/schema/*`, run `npm run db:generate`, commit the SQL in `drizzle/`.

## Modules

| Module | Owns |
| --- | --- |
| [auth](src/modules/auth) | registration, email login, Sign-In With Solana, sessions, password reset |
| [gamer](src/modules/gamer/README.md) | gamer profiles, libraries |
| [wallets](src/modules/wallets/README.md) | linked Solana wallets |
| [partner](src/modules/partner/README.md) | partner orgs, members, API keys |
| [games](src/modules/games/README.md) | catalog, partner game management, review |
| [payments](src/modules/payments/README.md) | SOL purchases verified on-chain |
| [admin](src/modules/admin/README.md) | users, roles, reviews, audit log |

## Who's who

- **Gamers** — sign up with email + password or just by signing with a Solana wallet.
  Link more wallets; pay for games in SOL from them.
- **Partners** — studios that host their own games. A user applies, becomes the partner's
  owner, an admin approves. Team roles: owner > admin > developer. Partner backends can use
  scoped API keys.
- **Admins** — review partners and games, manage users and roles, read the audit log.

## Authentication

| Endpoint | |
| --- | --- |
| `POST /auth/register` | `{ accountType: 'gamer', email, password, username }` or `{ accountType: 'partner', email, password, displayName }` |
| `POST /auth/login` | `{ email, password }` |
| `POST /auth/wallet/nonce` → `POST /auth/wallet/verify` | Sign-In With Solana: sign the returned message, send `{ address, nonce, signature }` |
| `POST /auth/refresh` | new token pair (cookie, or `{ refreshToken }` for native apps) |
| `POST /auth/logout`, `/auth/logout-all` | this device / everywhere |
| `POST /auth/verify-email`, `/verify-email/resend` | |
| `POST /auth/password/forgot`, `/password/reset`, `/password/change` | reset and change kill all sessions |
| `GET /auth/me` | |

- **Access token**: HS256 JWT, 15 min, sent as `Authorization: Bearer`. Every request also
  re-checks the user's status, session and roles in one query, so suspensions, logouts and
  role changes apply instantly (cache this if it becomes hot).
- **Refresh token**: 256-bit random, stored as sha256, 30 days, rotated on every use. Browsers
  get it as an `httpOnly; SameSite=Strict` cookie scoped to `/auth`; native clients send
  `X-Token-Transport: body`. Reusing a rotated token revokes the whole session family.
- **Passwords**: argon2id (OWASP parameters), 10–128 chars, constant-time-ish login for
  unknown emails, no account enumeration on reset.
- **Wallet sign-in**: one-time nonce, 5-minute expiry, consumed atomically before the ed25519
  signature is checked.
- **API keys**: `X-API-Key: pp_<prefix>_<secret>`, shown once, stored hashed, scoped,
  revocable, only valid while the partner is approved.

## Authorization

Permissions are defined in [`shared/auth/permissions.ts`](src/shared/auth/permissions.ts) and
granted to roles in code. Routes check permissions; services check ownership
(`assertPartnerAccess`). See the backend guide for the rules.

## Hardening already in place

helmet, CORS allowlist, 100 kB body limit, global and per-auth-route rate limits, request
IDs, structured logs with secrets redacted, audit log, graceful shutdown, `/health` and `/ready`.

## Before production

- Rate limits use in-memory stores: switch to a Redis store when running more than one instance.
- Replace `consoleMailer` with a real provider.
- Add a job that deletes expired nonces, email tokens and sessions, and expires stale payment intents.
