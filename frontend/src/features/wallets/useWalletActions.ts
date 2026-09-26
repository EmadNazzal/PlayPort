import { WalletReadyState, type WalletName } from '@solana/wallet-adapter-base';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { useQueryClient } from '@tanstack/react-query';
import bs58 from 'bs58';
import { useCallback, useRef } from 'react';
import { api, ApiError } from '@/lib/api';
import { keys, useSignedIn } from '@/lib/queries';
import type { Nonce, Payment, TokenResponse } from '@/lib/types';

/** Resolves once the adapter reports a connected public key (select() connects asynchronously). */
const waitForKey = (get: () => PublicKey | null, timeoutMs = 60_000) =>
  new Promise<PublicKey>((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      const key = get();
      if (key) return resolve(key);
      if (Date.now() - started > timeoutMs) return reject(new Error('Wallet connection timed out'));
      setTimeout(tick, 100);
    };
    tick();
  });

export const useWalletActions = () => {
  const wallet = useWallet();
  const { connection } = useConnection();
  const qc = useQueryClient();
  const signedIn = useSignedIn();

  // Latest adapter state for async flows that span re-renders.
  const latest = useRef(wallet);
  latest.current = wallet;

  const detected = wallet.wallets.filter(
    (w) => w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable,
  );

  /** Selects and connects a wallet, returning its address. */
  const connect = useCallback(
    async (name: WalletName): Promise<PublicKey> => {
      if (wallet.wallet?.adapter.name === name && wallet.publicKey) return wallet.publicKey;
      const entry = wallet.wallets.find((w) => w.adapter.name === name);
      if (!entry) throw new Error('Wallet not found');
      wallet.select(name);
      // Connect the adapter directly: the provider's select() → connect() hop is async.
      if (!entry.adapter.connected) await entry.adapter.connect();
      return waitForKey(() => entry.adapter.publicKey ?? latest.current.publicKey);
    },
    [wallet],
  );

  const signNonce = async (name: WalletName, nonceFor: (address: string) => Promise<Nonce>) => {
    const key = await connect(name);
    const address = key.toBase58();
    const { nonce, message } = await nonceFor(address);
    const adapter = wallet.wallets.find((w) => w.adapter.name === name)!.adapter;
    if (!('signMessage' in adapter) || typeof adapter.signMessage !== 'function') {
      throw new Error(`${name} can't sign messages. Try another wallet.`);
    }
    const signature = await adapter.signMessage(new TextEncoder().encode(message));
    return { address, nonce, signature: bs58.encode(signature) };
  };

  /** Sign-In With Solana: signs a one-time message; creates a gamer account on first use. */
  const signInWithWallet = async (name: WalletName) => {
    const signed = await signNonce(name, (address) => api<Nonce>('/auth/wallet/nonce', { method: 'POST', body: { address } }));
    const tokens = await api<TokenResponse>('/auth/wallet/verify', { method: 'POST', body: signed });
    await signedIn(tokens);
    return tokens;
  };

  /** Proves ownership of a wallet and attaches it to the signed-in account. */
  const linkWallet = async (name: WalletName, label?: string) => {
    const signed = await signNonce(name, (address) => api<Nonce>('/wallets/nonce', { method: 'POST', body: { address } }));
    await api('/wallets', { method: 'POST', body: { ...signed, ...(label && { label }) } });
    await qc.invalidateQueries({ queryKey: keys.wallets });
    return signed.address;
  };

  /**
   * Buys a game: server creates the intent → wallet signs a transfer carrying the intent's
   * reference key → server verifies it on-chain. Confirmation is retried while the RPC catches up.
   */
  const buyGame = async (gameId: string, onStage?: (stage: 'intent' | 'sign' | 'confirm') => void) => {
    if (!wallet.publicKey || !wallet.sendTransaction) throw new Error('Connect a wallet first');
    onStage?.('intent');
    const intent = await api<Payment>('/payments', { method: 'POST', body: { gameId } });

    onStage?.('sign');
    const ix = SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: new PublicKey(intent.recipientAddress),
      lamports: BigInt(intent.amountLamports),
    });
    ix.keys.push({ pubkey: new PublicKey(intent.reference), isSigner: false, isWritable: false });
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    const tx = new Transaction({ feePayer: wallet.publicKey, blockhash, lastValidBlockHeight }).add(ix);
    const signature = await wallet.sendTransaction(tx, connection);

    onStage?.('confirm');
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
    for (let attempt = 0; ; attempt++) {
      try {
        const confirmed = await api<Payment>(`/payments/${intent.id}/confirm`, { method: 'POST', body: { signature } });
        await Promise.all([qc.invalidateQueries({ queryKey: keys.library }), qc.invalidateQueries({ queryKey: keys.payments })]);
        return confirmed;
      } catch (err) {
        const notYet = err instanceof ApiError && err.message.includes('not yet confirmed');
        if (!notYet || attempt >= 8) throw err;
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  };

  return { ...wallet, detected, connect, signInWithWallet, linkWallet, buyGame };
};
