import { Connection, type ParsedInstruction, type PartiallyDecodedInstruction } from '@solana/web3.js';

export type SolTransfer = { source: string; destination: string; lamports: bigint };

export type VerifiedTransaction = {
  /** Null when the transaction succeeded. */
  err: unknown;
  blockTime: Date | null;
  accountKeys: string[];
  transfers: SolTransfer[];
};

/** Abstraction over the RPC so payment logic is testable without a live cluster. */
export type SolanaGateway = {
  getTransaction(signature: string): Promise<VerifiedTransaction | null>;
};

const isSystemTransfer = (ix: ParsedInstruction | PartiallyDecodedInstruction): ix is ParsedInstruction =>
  'parsed' in ix && ix.program === 'system' && (ix.parsed as { type?: string }).type === 'transfer';

export const createSolanaGateway = (rpcUrl: string): SolanaGateway => {
  const connection = new Connection(rpcUrl, 'confirmed');
  return {
    async getTransaction(signature) {
      const tx = await connection.getParsedTransaction(signature, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
      if (!tx?.meta) return null;

      const instructions = [
        ...tx.transaction.message.instructions,
        ...(tx.meta.innerInstructions ?? []).flatMap((inner) => inner.instructions),
      ];
      const transfers = instructions.filter(isSystemTransfer).map((ix) => {
        const info = ix.parsed.info as { source: string; destination: string; lamports: number | string };
        return { source: info.source, destination: info.destination, lamports: BigInt(info.lamports) };
      });

      return {
        err: tx.meta.err,
        blockTime: tx.blockTime ? new Date(tx.blockTime * 1000) : null,
        accountKeys: tx.transaction.message.accountKeys.map((k) => k.pubkey.toBase58()),
        transfers,
      };
    },
  };
};
