# payments module

Gamers pay for games in SOL, straight from a linked wallet to the partner's payout wallet.
PlayPort never holds funds.

1. `POST /payments { gameId }` → the server fixes amount, recipient and a unique `reference`
   public key, and returns a `solanaPayUrl` (valid `PAYMENT_TTL_MINUTES`).
2. The frontend builds a SystemProgram transfer that **includes the reference as a read-only
   key** (Solana Pay does this for you) and the gamer signs it in their wallet.
3. `POST /payments/:id/confirm { signature }` → verified on-chain: confirmed and successful,
   contains the reference, transfers ≥ amount from one of the buyer's linked wallets to the
   recipient, landed before expiry. A transaction can settle only one payment.
4. On success the game is added to the gamer's library.

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/payments` | user — my payments |
| POST | `/payments` | `payments:create` |
| POST | `/payments/:id/confirm` | `payments:create` |
| GET | `/payments/partner?partnerId=` | `payments:read_partner` + partner admin / API key |

Not yet: platform fee split, refunds, SPL tokens (USDC), a background job expiring stale intents.
