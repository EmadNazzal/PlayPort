# wallets module

Solana wallets linked to a user. Ownership is always proven by signing a one-time,
server-issued message — PlayPort never sees private keys or seed phrases. An address can
belong to only one account. Linked wallets double as a sign-in method (see `auth`) and as
the accepted payers for purchases (see `payments`).

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/wallets` | my wallets |
| POST | `/wallets/nonce` | `{ address }` → message to sign |
| POST | `/wallets` | `{ address, nonce, signature, label? }` → link |
| PATCH | `/wallets/:id` | `{ label?, isPrimary? }` |
| DELETE | `/wallets/:id` | refused if it's the account's only sign-in method |
