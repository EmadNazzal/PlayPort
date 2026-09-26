/**
 * Film 1 — head-to-head wager (staged concept). See README.md.
 * Needs backend :4000 + frontend :5174 on a fresh `npm run db:seed`, Chrome and ffmpeg.
 */
import { startFilm } from './lib.mjs';

const MATCH = '/concept/lobby/7Q4F?game=breach-protocol&host=leo&guest=mia&stake=5';
const { frames, wait, D, click, type, approveWallet, signIn, connectWallet, finish } = await startFilm({ name: 'wager', iframeWidth: 1100 });

// ---------------------------------------------------------------- the film
await frames.a.getByRole('banner').getByRole('button', { name: 'Sign in' }).waitFor({ timeout: 30_000 });
await frames.b.getByRole('banner').getByRole('button', { name: 'Sign in' }).waitFor({ timeout: 30_000 });
await wait(3500);
await D('card', null);
await wait(500);

await D('step', 1, 'Player A signs in and connects a wallet', 'Email sign-in, then any Solana wallet — here, a demo wallet');
await D('focus', 'a');
await wait(900);
await signIn('a', 'leo@gamer.dev');
await connectWallet('a');

await D('step', 2, 'Player B does the same', 'Each wallet is proven to belong to its PlayPort account');
await D('focus', 'b');
await wait(900);
await signIn('b', 'mia@gamer.dev');
await connectWallet('b');

await D('step', 3, 'Player A picks a game and challenges Player B', 'Find a player by username and send an invite');
await D('focus', 'a');
await wait(700);
await click('a', frames.a.getByRole('banner').getByRole('button', { name: /Search games/ }));
await frames.a.locator('[cmdk-input]').pressSequentially('breach', { delay: 70 });
await wait(500);
await frames.a.locator('[cmdk-input]').press('Enter');
await wait(1600);
await D('url', 'a', 'playport.gg/games/breach-protocol');
await click('a', frames.a.getByRole('button', { name: /Challenge a player/ }));
await type('a', frames.a.getByPlaceholder('Search by username'), 'mia');
await click('a', frames.a.getByRole('dialog').getByRole('button', { name: /@mia/ }));
await click('a', frames.a.getByRole('dialog').getByRole('button', { name: '5 SOL', exact: true }));
await wait(600);

await D('step', 4, 'Both players put 5 SOL on the line', 'Stakes lock into an on-chain escrow — nobody can touch them mid-match');
await click('a', frames.a.getByRole('dialog').getByRole('button', { name: /Lock 5 SOL/ }));
await approveWallet('a');
await wait(900);
await D('url', 'a', 'playport.gg/match/7Q4F');
await D('focus', 'b');
await D('send', 'b', { type: 'invite', from: 'leo', game: 'Breach Protocol', stake: 5, to: `${MATCH}&role=guest` });
await wait(1400);
await click('b', frames.b.getByRole('button', { name: 'View invite' }), { pause: 1200 });
await D('url', 'b', 'playport.gg/match/7Q4F');
await click('b', frames.b.getByRole('button', { name: /Accept & lock 5 SOL/ }));
await approveWallet('b');
await D('send', 'a', { type: 'state', patch: { guestLocked: true } });
await D('focus', 'both');
await D('cursor', 1880, 1040, false);
await wait(2200);

await D('step', 5, 'Handed off to the studio’s game server', 'Breach Protocol runs on Ironclad’s own servers — not PlayPort’s');
await D('send', 'a', { type: 'state', patch: { launching: true } });
await D('send', 'b', { type: 'state', patch: { launching: true } });
await wait(2750);
await D('url', 'a', 'play.breachprotocol.gg/match/7Q4F', true);
await D('url', 'b', 'play.breachprotocol.gg/match/7Q4F', true);
await wait(1000);

await D('step', 6, 'The match plays out', 'Final round — Player A takes it 13–9');
await wait(4200);

await D('step', 7, 'Back to PlayPort with a signed result', 'Ironclad’s server reports the winner; PlayPort verifies the signature');
await wait(3200);
await D('url', 'a', 'playport.gg/match/7Q4F/settlement');
await D('url', 'b', 'playport.gg/match/7Q4F/settlement');
await wait(2600);

await D('step', 8, 'Escrow settles the pot', 'Winner 9 SOL · studio 0.9 SOL · PlayPort 0.1 SOL');
await wait(4200);
await D('card', 'outro');
await wait(6500);

await finish();
