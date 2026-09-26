# auth module

Who you are. Email + password (argon2id) and Sign-In With Solana, issuing a short-lived JWT
access token plus a rotating refresh token. Endpoints and the security model are documented
in [backend/README.md](../../../README.md#authentication).

Files:
- `auth.service.ts` — registration, login, wallet sign-in, email verification, password flows
- `sessions.ts` — refresh-token issue, rotation, reuse detection, revocation
- `siws.ts` — Sign-In With Solana message format and ed25519 verification
- `passwords.ts` — argon2id hashing

Authorization primitives (permissions, guards, the `Principal` type) live in
`src/shared/auth/` because every module uses them.
