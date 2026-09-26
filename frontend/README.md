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
| `/` | Store — spotlight carousel, genre chips, rails, studios |
| `/browse` | Grid with price / genre / platform / studio filters and sort (state lives in the URL) |
| `/games/:slug` | Game page — buy, claim or play; checkout dialog |
| `/player` | **Player area** — Library, `/wallets`, `/purchases`, `/profile` (signed in) |
| `/studio` | **Studio area** — apply to become a partner, or jump to your studio (signed in) |
| `/studio/new` | Apply for another studio |
| `/studio/:id` | Studio dashboard — stats and games; tabs `/sales`, `/team`, `/settings` |
| `/studio/:id/games/new`, `/studio/:id/games/:gameId` | Game editor with a live poster preview |

Sign in / sign up is a dialog available everywhere (header button, or any signed-in-only route).
Email sign-up asks "I play games" vs "I make games"; studio accounts land on `/studio`.
⌘K opens search. Old `/market/...`, `/library` and `/account` URLs redirect.

## Structure

```
src/
├── app/            # providers, router
├── components/     # ThemeToggle, ui/ primitives (Button, Dialog, Field, Price, ...)
├── features/
│   ├── auth/       # auth dialog (wallet + email), RequireAuth
│   ├── wallets/    # Solana providers, wallet picker, wallet chip, sign-in / link / pay flows
│   ├── market/     # store, browse, game page, checkout, ⌘K, poster/ (illustrated key art)
│   ├── player/     # player area: library, wallets, purchases, profile
│   └── studio/     # partner area: apply, dashboard, game editor, sales, team, settings
└── lib/            # api client, session, theme, React Query hooks, types, formatting
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

The art supplies the colour; the chrome stays neutral. Tokens are in `src/styles.css`. Dark is the
default; `[data-theme='light']` on `<html>` swaps the values. Users pick Light / Dark / System from
the header (`lib/theme.ts`, persisted in localStorage); an inline script in `index.html` applies it
before first paint so there's no flash.

| Token | Use | Never |
| --- | --- | --- |
| `go` #14F195 | Buy / pay / confirm buttons (`text-on-go` on top) | Body text |
| `go-fg` | Green *text*: "Live", "Owned", success | Backgrounds |
| `lantern` / `lantern-fg` | Free badges, in-review, warnings (tint / text) | Buttons |
| `wallet` | The connected-wallet ring only | Anywhere else |
| `veil` | Overlay tints: `bg-veil/[0.05]`, `ring-veil/10` (white on dark, black on light) | Hard-coded `white/` or `black/` |
| `ink` / `surface` / `raised` | Page / cards / popovers | — |

- Never hard-code `white/…` or `text-green-…` — use the tokens so both themes work.
- **Type:** Bricolage Grotesque (display, `wdth` 76–85 for headlines), Geist (UI), Geist Mono
  (prices, addresses, eyebrows).
- **Game art:** `GameCover` shows the studio's image, or an illustrated poster from
  `market/poster` (per-game recipes, genre fallbacks). Cards are 2:3; titles and prices are always
  visible — never hover-only.
- **Motion:** entrances and crossfades are CSS (`animate-rise`, `.fade-layer`) so they stay
  smooth when the main thread is busy; `motion` is for scroll-linked values. UI transitions
  ≤ 300 ms with `--ease-out`; pressables scale to 0.97; hover effects sit behind
  `@media (hover: hover)`; ⌘K has no animation; `prefers-reduced-motion` is respected.
- **Responsive hiding:** components set their own `display`, so hide them with a wrapper
  (`<span className="hidden sm:block"><Price/></span>`), not by passing `hidden` in `className`.
