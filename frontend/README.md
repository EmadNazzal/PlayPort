# PlayPort frontend

React 19 + Vite + TypeScript + Tailwind v4. Read [the React guide](../docs/best-practices/react.md) first.

```bash
cp .env.example .env     # Solana RPC + cluster (devnet by default)
npm install
npm run dev              # http://localhost:5173 — proxies /api to the backend on :4000
```

The backend must run with `REFRESH_COOKIE_PATH=/api/auth` (already in its `.env.example`) so the
refresh cookie survives the `/api` proxy.

## Routes

| Path | Page |
| --- | --- |
| `/` | Landing — WebGL hero, game-art montage, how it works, studios, FAQ. Sign in / sign up open the auth dialog. |
| `/market` | Store — spotlight carousel, genre chips, rails, studios |
| `/market/browse` | Grid with price / genre / platform / studio filters and sort (state lives in the URL) |
| `/market/games/:slug` | Game page — buy, claim or play; checkout dialog |
| `/library` | Owned games (signed in) |
| `/account` | Profile, linked wallets, purchase receipts (signed in) |

⌘K opens search from anywhere.

## Structure

```
src/
├── app/            # providers, router
├── components/     # ShaderField (WebGL), Reveal, ui/ primitives (Button, Dialog, Price, ...)
├── features/
│   ├── auth/       # auth dialog (wallet + email), RequireAuth
│   ├── wallets/    # Solana providers, wallet picker, wallet chip, sign-in / link / pay flows
│   ├── landing/    # marketing page sections
│   ├── market/     # store, browse, game page, checkout, generative covers, ⌘K
│   ├── library/
│   └── account/
└── lib/            # api client, session, React Query hooks, types, formatting
```

## Auth

- The access token lives **in memory only** (`lib/session.ts`); the refresh token is an httpOnly
  cookie. On boot the app calls `/auth/refresh` once to restore the session.
- `lib/api.ts` retries a request once after a silent refresh on 401, sharing a single in-flight
  refresh — two parallel refreshes would trip the server's reuse detection and log you out.

## Wallets

Any Wallet Standard wallet (Phantom, Solflare, Backpack, Jupiter, MetaMask's Solana account) is
detected automatically — `wallets={[]}` in `features/wallets/solana.tsx`. All wallet logic is in
`useWalletActions`:
- `signInWithWallet` — Sign-In With Solana (creates a gamer account for new wallets)
- `linkWallet` — prove ownership and attach to the signed-in account
- `buyGame` — payment intent → transfer carrying the intent's reference key → on-chain confirm

Devnet by default. Get test SOL at https://faucet.solana.com.

## Design system — "Night Market"

The art supplies the colour; the chrome stays warm ink. Tokens are in `src/styles.css`.

| Token | Use | Never |
| --- | --- | --- |
| `go` #14F195 | Buy, pay, confirmed, primary CTA | Body text, decoration |
| `lantern` #FFB547 | "Free" badges, sale, highlights | Buttons |
| `wallet` #9945FF | The connected-wallet ring only | Anywhere else |
| `ink` / `surface` / `raised` | Page / cards / popovers | — |

- **Type:** Bricolage Grotesque (display, use `wdth` 76–85 for headlines), Geist (UI), Geist Mono
  (prices, addresses, eyebrows).
- **Game art:** `GameCover` generates key art per slug and genre until a studio uploads
  `thumbnailUrl` / `bannerUrl`. Titles and prices are always visible on cards — never hover-only.
- **Motion:** entrances and crossfades are CSS (`Reveal`, `.fade-layer`, `animate-rise`) so they
  stay smooth when the main thread is busy. `motion` is for pointer-driven springs (tilt cards)
  and scroll-linked values. UI transitions ≤ 300 ms with the `--ease-out` curve; pressables scale
  to 0.97; hover effects sit behind `@media (hover: hover)`; ⌘K has no animation. Respect
  `prefers-reduced-motion` (handled globally and in `ShaderField`).
- **Spectacle stays on the landing page.** No WebGL, smooth scrolling or autoplay in the store.
