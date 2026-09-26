/**
 * Records the head-to-head wager concept video (see README.md).
 * Needs: backend on :4000 and frontend on :5174, freshly seeded (`npm run db:seed`), Google
 * Chrome installed, ffmpeg on PATH.  Output: out/playport-wager-demo.mp4
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'out');
const require = createRequire(join(here, '../../backend/package.json'));
const nacl = readFileSync(require.resolve('tweetnacl/nacl-fast.min.js'), 'utf8');
const wallet = readFileSync(join(here, 'wallet.js'), 'utf8');
const PASSWORD = 'playport-dev-password'; // seed script's shared test password
const MATCH = '/concept/lobby/7Q4F?game=breach-protocol&host=leo&guest=mia&stake=5';

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, colorScheme: 'dark' });
await context.addInitScript({ content: `${nacl}\n${wallet}` });
const page = await context.newPage();

// Capture with Chrome's screencast (sharper than Playwright's VP8 recorder). Frames only arrive
// when something changes, so each keeps its timestamp and is held until the next one.
const framesDir = join(out, 'frames');
mkdirSync(framesDir, { recursive: true });
const shots = [];
const cdp = await context.newCDPSession(page);
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  const file = join(framesDir, `${String(shots.length).padStart(6, '0')}.jpg`);
  writeFileSync(file, Buffer.from(data, 'base64'));
  shots.push({ file, t: metadata.timestamp });
  await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});

const wait = (ms) => page.waitForTimeout(ms);
const D = (fn, ...args) => page.evaluate(([f, a]) => window.director[f](...a), [fn, args]);
const frames = { a: page.frameLocator('#frame-a'), b: page.frameLocator('#frame-b') };

const IFRAME_WIDTH = 1100; // must match director.html

/**
 * Glide the fake cursor to an element, pulse, then click it.
 * The player views are CSS-scaled iframes, and Playwright's coordinates inside them ignore that
 * scale — so the cursor position is corrected here, and the click is dispatched on the element
 * itself rather than at a screen coordinate.
 */
const click = async (side, locator, { pause = 450 } = {}) => {
  try {
    await locator.waitFor({ state: 'visible', timeout: 15_000 });
  } catch (err) {
    await page.screenshot({ path: join(out, 'failed-step.png') });
    throw err;
  }
  await locator.scrollIntoViewIfNeeded();
  const [box, frame] = await Promise.all([locator.boundingBox(), page.locator(`#frame-${side}`).boundingBox()]);
  const scale = frame.width / IFRAME_WIDTH;
  const x = frame.x + (box.x + box.width / 2 - frame.x) * scale;
  const y = frame.y + (box.y + box.height / 2 - frame.y) * scale;
  await D('cursor', x - 4, y - 2);
  await wait(700);
  await D('clickPulse');
  await locator.dispatchEvent('click');
  await wait(pause);
};
const type = async (side, locator, text) => {
  await click(side, locator, { pause: 150 });
  await locator.focus();
  await locator.pressSequentially(text, { delay: 55 });
};
const approveWallet = async (side) => click(side, frames[side].locator('#demo-wallet-approve'), { pause: 700 });

const signIn = async (side, email) => {
  const f = frames[side];
  await click(side, f.getByRole('banner').getByRole('button', { name: 'Sign in' }));
  const dialog = f.getByRole('dialog');
  await click(side, dialog.getByRole('tab', { name: /Email/ }));
  await type(side, dialog.locator('input[name=email]'), email);
  await type(side, dialog.locator('input[name=password]'), PASSWORD);
  await click(side, dialog.locator('button[type=submit]'), { pause: 1400 });
};
const connectWallet = async (side) => {
  const f = frames[side];
  await click(side, f.getByRole('banner').getByRole('button', { name: /Connect/ }));
  await click(side, f.getByRole('dialog').getByRole('button', { name: /Demo Wallet/ }));
  await approveWallet(side);
  await wait(900);
};

// ---------------------------------------------------------------- the film
await page.goto(pathToFileURL(join(here, 'director.html')).href);
await D('card', 'intro');
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080 });
const filmStarted = Date.now() / 1000;
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

// ---------------------------------------------------------------- encode
await cdp.send('Page.stopScreencast');
await context.close();
await browser.close();

// ffmpeg concat list: every frame shown until the next arrives, resampled to a constant 30fps.
const end = Date.now() / 1000;
const kept = shots.filter((s) => s.t >= filmStarted - 0.5);
const list = kept.map((s, i) => `file '${s.file}'\nduration ${Math.max(0.001, (kept[i + 1]?.t ?? end) - s.t).toFixed(4)}`).join('\n');
writeFileSync(join(out, 'frames.txt'), `${list}\nfile '${kept.at(-1).file}'\n`);
const mp4 = join(out, 'playport-wager-demo.mp4');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(out, 'frames.txt'), '-fps_mode', 'cfr', '-r', '30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4]);
rmSync(framesDir, { recursive: true, force: true });
rmSync(join(out, 'frames.txt'));
console.log(`Wrote ${mp4} (${(end - filmStarted).toFixed(1)}s, ${kept.length} frames)`);
