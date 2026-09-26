/**
 * Film 2 — one wallet across games (staged in-game purchases). See README.md.
 * Needs backend :4000 + frontend :5174 on a fresh `npm run db:seed`, Chrome and ffmpeg.
 */
import { startFilm } from './lib.mjs';

const { frames, wait, D, click, type, approveWallet, signIn, connectWallet, finish } = await startFilm({ name: 'wallet', query: '&film=wallet', iframeWidth: 1600 });
const a = frames.a;

await a.getByRole('banner').getByRole('button', { name: 'Sign in' }).waitFor({ timeout: 30_000 });
await wait(3500);
await D('card', null);
await wait(500);

await D('step', 1, 'The player signs in and connects a wallet', 'One Solana wallet for every game on PlayPort');
await wait(900);
await signIn('a', 'leo@gamer.dev');
await connectWallet('a');

await D('step', 2, 'Browse the store and jump straight into a game', 'Breach Protocol runs on Ironclad’s own servers — PlayPort just gets you there');
await click('a', a.getByRole('banner').getByRole('link', { name: 'Browse' }), { pause: 1200 });
await D('url', 'a', 'playport.gg/browse');
await click('a', a.getByRole('button', { name: 'Shooter', exact: true }), { pause: 1200 });
await click('a', a.getByRole('link', { name: /Breach Protocol/ }).first(), { pause: 1600 });
await D('url', 'a', 'playport.gg/games/breach-protocol');
await wait(600);
await click('a', a.getByRole('button', { name: /Play now/ }).first(), { pause: 400 });
await D('url', 'a', 'play.breachprotocol.gg/armory', true);
await wait(1800);

await D('step', 3, 'Buy a gun skin for 2 SOL — without leaving the game', 'Pay with PlayPort opens inside the game; the balance updates live');
await click('a', a.getByRole('button', { name: 'Skin Ember Dragon' }), { pause: 700 });
await click('a', a.getByRole('button', { name: /BUY FOR 2 SOL/ }), { pause: 900 });
await click('a', a.getByRole('button', { name: 'Pay 2 SOL' }));
await approveWallet('a');
await wait(3200);

await D('step', 4, 'Hop over to another game', 'Sugarfall by Honeycomb Games — same wallet, no new account');
await click('a', a.getByRole('link', { name: /BACK TO PLAYPORT/ }), { pause: 1400 });
await D('url', 'a', 'playport.gg');
await click('a', a.getByRole('banner').getByRole('button', { name: /Search games/ }));
await a.locator('[cmdk-input]').pressSequentially('sugar', { delay: 80 });
await wait(600);
await a.locator('[cmdk-input]').press('Enter');
await wait(1500);
await D('url', 'a', 'playport.gg/games/sugarfall');
await click('a', a.getByRole('button', { name: /Play now/ }).first(), { pause: 400 });
await D('url', 'a', 'play.sugarfall.gg/level/212', true);
await wait(2000);

await D('step', 5, 'Out of moves? Grab a power-up for 1 SOL', 'Another one-tap purchase — the balance drops to 22 SOL');
await click('a', a.getByRole('button', { name: /Get it for 1 SOL/ }), { pause: 900 });
await click('a', a.getByRole('button', { name: 'Pay 1 SOL' }));
await approveWallet('a');
await wait(4200);

await D('step', 6, 'Everything lands in the PlayPort wallet', 'Balance, spending by game, and every transaction with its receipt');
await click('a', a.getByRole('link', { name: /Back to PlayPort/ }), { pause: 1200 });
await D('url', 'a', 'playport.gg');
await click('a', a.getByRole('banner').getByRole('button', { name: /…/ }), { pause: 500 });
await click('a', a.getByRole('menuitem', { name: /Wallet & activity/ }), { pause: 800 });
await D('url', 'a', 'playport.gg/player/wallet');
await D('cursor', 1880, 1040, false);
await wait(2600);
await a.getByRole('heading', { name: 'Transactions' }).evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
await wait(3800);

await D('card', 'outro');
await wait(6500);
await finish();
