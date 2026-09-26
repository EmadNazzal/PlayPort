import { Keypair } from '@solana/web3.js';
import { beforeEach, describe, expect, it } from 'vitest';
import { api, approvedPartner, auth, chainTxs, linkWallet, makeAdmin, publishedGame, registerGamer, resetDb } from './helpers.js';

beforeEach(resetDb);

const fakeSignature = () => Keypair.generate().publicKey.toBase58() + Keypair.generate().publicKey.toBase58().slice(0, 44);

const setup = async (price = '500000000') => {
  const admin = await makeAdmin();
  const { owner, partnerId, payout } = await approvedPartner(admin.token);
  const game = await publishedGame(admin.token, owner.token, partnerId, price);
  const gamer = await registerGamer();
  const wallet = await linkWallet(gamer.token);
  return { admin, owner, partnerId, payout, game, gamer, wallet };
};

const onChain = (p: { reference: string; from: string; to: string; lamports: bigint; err?: unknown }) => {
  const sig = fakeSignature();
  chainTxs.set(sig, {
    err: p.err ?? null,
    blockTime: new Date(),
    accountKeys: [p.from, p.to, p.reference],
    transfers: [{ source: p.from, destination: p.to, lamports: p.lamports }],
  });
  return sig;
};

describe('SOL payments', () => {
  it('creates an intent with a Solana Pay URL and confirms a matching transfer', async () => {
    const { game, gamer, wallet, payout } = await setup();
    const intent = await api().post('/payments').set(auth(gamer.token)).send({ gameId: game.id }).expect(201);
    expect(intent.body).toMatchObject({ amountLamports: '500000000', recipientAddress: payout, status: 'pending' });
    expect(intent.body.solanaPayUrl).toContain('amount=0.5');

    const sig = onChain({ reference: intent.body.reference, from: wallet.publicKey.toBase58(), to: payout, lamports: 500_000_000n });
    const confirmed = await api().post(`/payments/${intent.body.id}/confirm`).set(auth(gamer.token)).send({ signature: sig }).expect(200);
    expect(confirmed.body.status).toBe('confirmed');

    const library = await api().get('/gamers/me/library').set(auth(gamer.token)).expect(200);
    expect(library.body.map((g: { gameId: string }) => g.gameId)).toEqual([game.id]);
    await api().post('/payments').set(auth(gamer.token)).send({ gameId: game.id }).expect(409); // already owned
  });

  it('rejects wrong transfers but keeps the intent payable', async () => {
    const { game, gamer, wallet, payout } = await setup();
    const intent = await api().post('/payments').set(auth(gamer.token)).send({ gameId: game.id }).expect(201);
    const from = wallet.publicKey.toBase58();
    const ref = intent.body.reference;
    const confirm = (signature: string) => api().post(`/payments/${intent.body.id}/confirm`).set(auth(gamer.token)).send({ signature });

    await confirm(onChain({ reference: Keypair.generate().publicKey.toBase58(), from, to: payout, lamports: 500_000_000n })).expect(400); // wrong reference
    await confirm(onChain({ reference: ref, from, to: payout, lamports: 499_999_999n })).expect(400); // underpaid
    await confirm(onChain({ reference: ref, from, to: Keypair.generate().publicKey.toBase58(), lamports: 500_000_000n })).expect(400); // wrong recipient
    await confirm(onChain({ reference: ref, from: Keypair.generate().publicKey.toBase58(), to: payout, lamports: 500_000_000n })).expect(400); // unlinked payer
    await confirm(onChain({ reference: ref, from, to: payout, lamports: 500_000_000n, err: { InstructionError: [0, 'Custom'] } })).expect(400); // failed tx
    await confirm(fakeSignature()).expect(400); // not on chain

    const ok = await confirm(onChain({ reference: ref, from, to: payout, lamports: 500_000_000n })).expect(200);
    expect(ok.body.status).toBe('confirmed');
  });

  it("can't use one transaction for two payments or confirm someone else's payment", async () => {
    const { game, gamer, wallet, payout, admin, owner, partnerId } = await setup();
    const intent = await api().post('/payments').set(auth(gamer.token)).send({ gameId: game.id }).expect(201);
    const sig = onChain({ reference: intent.body.reference, from: wallet.publicKey.toBase58(), to: payout, lamports: 500_000_000n });

    const thief = await registerGamer();
    await api().post(`/payments/${intent.body.id}/confirm`).set(auth(thief.token)).send({ signature: sig }).expect(404);
    await api().post(`/payments/${intent.body.id}/confirm`).set(auth(gamer.token)).send({ signature: sig }).expect(200);

    // Same signature against a second game's intent: the reference won't match.
    const game2 = await publishedGame(admin.token, owner.token, partnerId, '500000000');
    const intent2 = await api().post('/payments').set(auth(gamer.token)).send({ gameId: game2.id }).expect(201);
    await api().post(`/payments/${intent2.body.id}/confirm`).set(auth(gamer.token)).send({ signature: sig }).expect(400);
  });

  it('requires a linked wallet, and free games are claimed instead', async () => {
    const admin = await makeAdmin();
    const { owner, partnerId } = await approvedPartner(admin.token);
    const paid = await publishedGame(admin.token, owner.token, partnerId, '1000');
    const free = await publishedGame(admin.token, owner.token, partnerId);
    const gamer = await registerGamer();

    await api().post('/payments').set(auth(gamer.token)).send({ gameId: paid.id }).expect(400);
    await api().post('/payments').set(auth(gamer.token)).send({ gameId: free.id }).expect(400);
    await api().post(`/games/${free.id}/claim`).set(auth(gamer.token)).expect(201);
    await api().post(`/games/${free.id}/claim`).set(auth(gamer.token)).expect(409);
  });
});

describe('wallet linking', () => {
  it('an address can belong to only one account, and the last sign-in method is protected', async () => {
    const a = await registerGamer();
    const b = await registerGamer();
    const kp = await linkWallet(a.token);
    await expect(linkWallet(b.token, kp)).rejects.toThrow(); // 409 inside helper

    const wallets = await api().get('/wallets').set(auth(a.token)).expect(200);
    expect(wallets.body[0].isPrimary).toBe(true);
    await api().delete(`/wallets/${wallets.body[0].id}`).set(auth(a.token)).expect(204); // has a password, so fine
  });
});
