# Wager concept video

Records the 84-second split-screen pitch video of the **staged** head-to-head wager flow
(see `frontend/src/features/concept/README.md`): two players sign in and connect wallets,
A challenges B, both stake 5 SOL into escrow, they play on the studio's server, and PlayPort
settles the pot (winner 9 SOL · studio 0.9 · PlayPort 0.1).

## Record

```bash
cd backend && npm run db:seed          # fresh, known state (leo / mia, Breach Protocol)
# backend on :4000, frontend on :5174 (npx vite --port 5174)
cd tools/demo-video && npm install && npm run record
```

Output: `out/playport-wager-demo.mp4` (1920×1080, 30fps, H.264). Needs Google Chrome and
ffmpeg installed — nothing else is downloaded.

## How it works

- `director.html` — the 1920×1080 frame: step captions, title cards, a fake cursor, and two
  "browser windows" that embed the real app. Player A loads `localhost`, Player B `[::1]`, so
  each has its own cookies and storage (two separate sessions).
- `wallet.js` — injected into both frames: a real Wallet Standard wallet ("Demo Wallet") backed
  by the seed script's test keypairs, with an extension-style approval popup. The app's normal
  connect and sign code runs against it.
- `record.mjs` — Playwright drives both players (real sign-in, wallet connect, search, the
  challenge dialog), cues the staged parts through the app's `DemoBridge`, captures frames with
  Chrome's screencast and encodes them with ffmpeg.

Timings live in `record.mjs`; the match and settlement animations in `features/concept`.
