import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import type { ReactNode } from 'react';

export const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
export const SOLANA_CLUSTER = import.meta.env.VITE_SOLANA_CLUSTER ?? WalletAdapterNetwork.Devnet;

/**
 * `wallets={[]}`: every modern Solana wallet (Phantom, Solflare, Backpack, Jupiter, MetaMask's
 * Solana account, ...) registers itself through the Wallet Standard and shows up automatically.
 */
export const SolanaProviders = ({ children }: { children: ReactNode }) => (
  <ConnectionProvider endpoint={SOLANA_RPC_URL}>
    <WalletProvider wallets={[]} autoConnect>
      {children}
    </WalletProvider>
  </ConnectionProvider>
);
