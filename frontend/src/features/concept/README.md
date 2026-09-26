# Concepts: in-game payments and head-to-head wagers (staged)

**Not a working feature.** These screens stage the wager flow for the pitch video
(`tools/demo-video`). Nothing here talks to the backend beyond sign-in and wallet connect —
stakes, escrow, the match and settlement are scripted.

Enabled only when the app is opened with `?concept=1` (remembered for the tab session).

**In-game payments** (`/concept/play/:slug`): Breach Protocol's armory and Sugarfall's board stand in
for studio sites. Both show the PlayPort balance in their HUD and sell items through the
"Pay with PlayPort" sheet (a partner SDK in the real product); purchases show up in
`/player/wallet`. The balance (25 SOL) and transactions are staged in `flag.ts`.

**Wagers** flow: game page → **Challenge a player** → lobby (both stakes locked in escrow) → studio's
game server (`/concept/match/:id`, no PlayPort chrome) → back to PlayPort for settlement.

Economics shown: pot = both stakes; the studio's fee is 10% of the pot; PlayPort takes 10% of
that fee; the winner gets the rest. 5 + 5 SOL → winner 9, studio 0.9, PlayPort 0.1.

To build it for real: an escrow program (Anchor) holding both stakes, a signed match-result
endpoint for studios (partner API key), and settlement that pays out from escrow.
