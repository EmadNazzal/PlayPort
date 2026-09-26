# Concept videos

Two staged pitch films, recorded from the real app:

| Film | Script | Story |
| --- | --- | --- |
| Wallet (74s) | `record-wallet.mjs` | Sign in, connect a wallet, open Breach Protocol and buy a 2 SOL skin in-game, hop to Sugarfall and buy a 1 SOL power-up, see it all in the PlayPort wallet (25 → 22 SOL). |
| Wager (86s) | `record-wager.mjs` | Split screen: two players stake 5 SOL each, play, and PlayPort settles the pot. |

The wager film records the 86-second split-screen video of the **staged** head-to-head wager flow
(see `frontend/src/features/concept/README.md`): two players sign in and connect wallets,
A challenges B, both stake 5 SOL into escrow, they play on the studio's server, and PlayPort
settles the pot (winner 9 SOL · studio 0.9 · PlayPort 0.1).

## Record

```bash
cd backend && npm run db:seed          # fresh, known state (leo / mia, Breach Protocol)
# backend on :4000, frontend on :5174 (npx vite --port 5174)
cd tools/demo-video && npm install && npm run record:wallet   # or record:wager
```

Re-seed before each film — they start from the seed's state. Output:
`out/playport-wallet-demo.mp4` / `out/playport-wager-demo.mp4` (1920×1080, 30fps, H.264). Needs Google Chrome and
ffmpeg installed — nothing else is downloaded.

## How it works

- `director.html` — the 1920×1080 frame: step captions, title cards, a fake cursor, and two
  "browser windows" that embed the real app. Player A loads `localhost`, Player B `[::1]`, so
  each has its own cookies and storage (two separate sessions).
- `wallet.js` — injected into both frames: a real Wallet Standard wallet ("Demo Wallet") backed
  by the seed script's test keypairs, with an extension-style approval popup. The app's normal
  connect and sign code runs against it.
- `lib.mjs` — shared capture, cursor-driven clicks and encoding.
- `record-*.mjs` — Playwright drives the players (real sign-in, wallet connect, search, the
  challenge dialog), cues the staged parts through the app's `DemoBridge`, captures frames with
  Chrome's screencast and encodes them with ffmpeg.

Timings live in `record.mjs`; the match and settlement animations in `features/concept`.
