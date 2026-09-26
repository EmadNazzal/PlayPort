# Concept: head-to-head wagers (staged)

**Not a working feature.** These screens stage the wager flow for the pitch video
(`tools/demo-video`). Nothing here talks to the backend beyond sign-in and wallet connect —
stakes, escrow, the match and settlement are scripted.

Enabled only when the app is opened with `?concept=1` (remembered for the tab session).

Flow: game page → **Challenge a player** → lobby (both stakes locked in escrow) → studio's
game server (`/concept/match/:id`, no PlayPort chrome) → back to PlayPort for settlement.

Economics shown: pot = both stakes; the studio's fee is 10% of the pot; PlayPort takes 10% of
that fee; the winner gets the rest. 5 + 5 SOL → winner 9, studio 0.9, PlayPort 0.1.

To build it for real: an escrow program (Anchor) holding both stakes, a signed match-result
endpoint for studios (partner API key), and settlement that pays out from escrow.
