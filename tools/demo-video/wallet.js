/*
 * Demo wallet, injected into each player's frame by record.mjs (after tweetnacl).
 * A genuine Wallet Standard wallet — the app's normal "connect" and "sign" code paths run
 * against it — backed by the seed script's deterministic test keypairs (never funded).
 * Each request shows an approval popup, like a browser extension would.
 */
(() => {
  const PLAYER = { localhost: 'leo-phantom', '[::1]': 'mia-solflare' }[location.hostname];
  if (!PLAYER || window.top === window) return;

  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const b58 = (bytes) => {
    let n = 0n;
    for (const b of bytes) n = n * 256n + BigInt(b);
    let out = '';
    while (n > 0n) { out = ALPHABET[Number(n % 58n)] + out; n /= 58n; }
    for (const b of bytes) { if (b !== 0) break; out = '1' + out; }
    return out;
  };

  let keypair;
  const keys = async () => {
    if (keypair) return keypair;
    const seed = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`playport-seed:${PLAYER}`)));
    keypair = nacl.sign.keyPair.fromSeed(seed);
    return keypair;
  };

  const ICON = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB547"/><stop offset="1" stop-color="#FF5A4E"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#g)"/><path d="M18 22h28v22H18z" fill="none" stroke="#16150f" stroke-width="5" stroke-linejoin="round"/><circle cx="40" cy="33" r="3.5" fill="#16150f"/></svg>');

  /** Extension-style approval card. Resolves when the user (or the recorder) approves. */
  const approve = (title, lines) =>
    new Promise((resolve, reject) => {
      const host = document.createElement('div');
      host.id = 'demo-wallet-popup';
      host.innerHTML = `
        <div style="position:fixed;top:72px;right:24px;z-index:2147483647;width:340px;border-radius:18px;background:#15171D;color:#F2EFE9;
          border:1px solid rgba(255,255,255,.14);box-shadow:0 30px 80px -10px rgba(0,0,0,.8);font:14px Geist,system-ui,sans-serif;overflow:hidden;
          animation:dw-in 220ms cubic-bezier(.23,1,.32,1)">
          <div style="display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08)">
            <img src="${ICON}" width="26" height="26" style="border-radius:7px"/><b style="font-weight:600">Demo Wallet</b>
            <span style="margin-left:auto;font:11px 'Geist Mono',monospace;color:#8C8F99">${location.host}</span>
          </div>
          <div style="padding:16px">
            <div style="font-size:16px;font-weight:600;margin-bottom:10px">${title}</div>
            ${lines.map((l) => `<div style="font:12px 'Geist Mono',monospace;color:#B8B6AE;line-height:1.6;word-break:break-all">${l}</div>`).join('')}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 16px 16px">
            <button id="demo-wallet-cancel" style="height:40px;border-radius:12px;border:0;background:rgba(255,255,255,.06);color:#F2EFE9;font:inherit;cursor:pointer">Cancel</button>
            <button id="demo-wallet-approve" style="height:40px;border-radius:12px;border:0;background:#14F195;color:#06140d;font:inherit;font-weight:600;cursor:pointer">Approve</button>
          </div>
        </div>
        <style>@keyframes dw-in{from{opacity:0;transform:translateY(-8px) scale(.97)}}</style>`;
      document.body.appendChild(host);
      host.querySelector('#demo-wallet-approve').onclick = () => { host.remove(); resolve(); };
      host.querySelector('#demo-wallet-cancel').onclick = () => { host.remove(); reject(new Error('User rejected the request')); };
    });

  const listeners = new Set();
  let accounts = [];
  const CHAINS = ['solana:devnet', 'solana:testnet', 'solana:mainnet'];

  const wallet = {
    version: '1.0.0',
    name: 'Demo Wallet',
    icon: ICON,
    chains: CHAINS,
    get accounts() { return accounts; },
    features: {
      'standard:connect': {
        version: '1.0.0',
        connect: async ({ silent } = {}) => {
          const kp = await keys();
          const address = b58(kp.publicKey);
          if (!silent) await approve('Connect to PlayPort?', [`Account ${address.slice(0, 6)}…${address.slice(-6)}`, 'Share your address. No funds move.']);
          accounts = [{ address, publicKey: kp.publicKey, chains: CHAINS, features: ['solana:signMessage', 'solana:signTransaction'] }];
          listeners.forEach((l) => l({ accounts }));
          return { accounts };
        },
      },
      'standard:disconnect': { version: '1.0.0', disconnect: async () => { accounts = []; listeners.forEach((l) => l({ accounts })); } },
      'standard:events': { version: '1.0.0', on: (event, l) => { if (event === 'change') listeners.add(l); return () => listeners.delete(l); } },
      'solana:signMessage': {
        version: '1.0.0',
        signMessage: async (...inputs) => {
          const kp = await keys();
          const out = [];
          for (const { message } of inputs) {
            await approve('Signature request', new TextDecoder().decode(message).split('\n'));
            out.push({ signedMessage: message, signature: nacl.sign.detached(message, kp.secretKey) });
          }
          return out;
        },
      },
      'solana:signTransaction': {
        version: '1.0.0',
        supportedTransactionVersions: ['legacy', 0],
        signTransaction: async (...inputs) => inputs.map(({ transaction }) => ({ signedTransaction: transaction })),
      },
    },
  };

  const callback = ({ register }) => register(wallet);
  try { window.dispatchEvent(new CustomEvent('wallet-standard:register-wallet', { detail: callback })); } catch {}
  try { window.addEventListener('wallet-standard:app-ready', ({ detail }) => callback(detail)); } catch {}
})();
