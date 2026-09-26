/** Shared plumbing for the demo films: browser + screencast capture, cursor-driven clicks, encode. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const here = dirname(fileURLToPath(import.meta.url));
export const PASSWORD = 'playport-dev-password'; // seed script's shared test password

/**
 * Opens the director page for a film and returns helpers. `iframeWidth` is the CSS width each
 * player's app renders at (director.html scales it into its window).
 */
export const startFilm = async ({ name, query = '', iframeWidth }) => {
  const out = join(here, 'out');
  const framesDir = join(out, `frames-${name}`);
  rmSync(framesDir, { recursive: true, force: true });
  mkdirSync(framesDir, { recursive: true });

  const require = createRequire(join(here, '../../backend/package.json'));
  const nacl = readFileSync(require.resolve('tweetnacl/nacl-fast.min.js'), 'utf8');
  const wallet = readFileSync(join(here, 'wallet.js'), 'utf8');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, colorScheme: 'dark' });
  await context.addInitScript({ content: `${nacl}\n${wallet}` });
  const page = await context.newPage();

  // Chrome's screencast is sharper than Playwright's VP8 recorder. Frames only arrive when
  // something changes, so each keeps its timestamp and is held until the next one.
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

  /**
   * Glide the fake cursor to an element, pulse, then click it. The player views are CSS-scaled
   * iframes and Playwright's coordinates inside them ignore that scale, so the cursor is
   * corrected here and the click is dispatched on the element rather than at a coordinate.
   */
  const click = async (side, locator, { pause = 450 } = {}) => {
    try {
      await locator.waitFor({ state: 'visible', timeout: 15_000 });
    } catch (err) {
      await page.screenshot({ path: join(out, `failed-${name}.png`) });
      throw err;
    }
    await locator.scrollIntoViewIfNeeded();
    const [box, frame] = await Promise.all([locator.boundingBox(), page.locator(`#frame-${side}`).boundingBox()]);
    const scale = frame.width / iframeWidth;
    await D('cursor', frame.x + (box.x + box.width / 2 - frame.x) * scale - 4, frame.y + (box.y + box.height / 2 - frame.y) * scale - 2);
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
  const approveWallet = (side) => click(side, frames[side].locator('#demo-wallet-approve'), { pause: 700 });

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

  await page.goto(`${pathToFileURL(join(here, 'director.html')).href}?w=${iframeWidth}${query}`);
  await D('card', 'intro');
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080 });
  const started = Date.now() / 1000;

  /** Stop capture and encode a constant-30fps H.264 MP4. */
  const finish = async () => {
    await cdp.send('Page.stopScreencast');
    await context.close();
    await browser.close();
    const end = Date.now() / 1000;
    const kept = shots.filter((s) => s.t >= started - 0.5);
    const list = kept.map((s, i) => `file '${s.file}'\nduration ${Math.max(0.001, (kept[i + 1]?.t ?? end) - s.t).toFixed(4)}`).join('\n');
    const listFile = join(out, `frames-${name}.txt`);
    writeFileSync(listFile, `${list}\nfile '${kept.at(-1).file}'\n`);
    const mp4 = join(out, `playport-${name}-demo.mp4`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile, '-fps_mode', 'cfr', '-r', '30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4]);
    rmSync(framesDir, { recursive: true, force: true });
    rmSync(listFile);
    console.log(`Wrote ${mp4} (${(end - started).toFixed(1)}s, ${kept.length} frames)`);
  };

  return { page, frames, wait, D, click, type, approveWallet, signIn, connectWallet, finish };
};
