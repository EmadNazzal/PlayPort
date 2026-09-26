import { create } from 'zustand';

const KEY = 'playport-concept';

/** Concept screens are on when the tab was opened with ?concept=1. */
export const isConcept = (): boolean => {
  try {
    if (new URLSearchParams(location.search).get('concept') === '1') sessionStorage.setItem(KEY, '1');
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

/** A staged in-game purchase paid from the PlayPort wallet. */
export type InGameTx = { id: string; game: string; gameSlug: string; item: string; sol: number; at: number; signature: string };

/** Cross-screen state for the staged flows, updated by the user and by the director script. */
type ConceptState = {
  hostLocked: boolean;
  guestLocked: boolean;
  launching: boolean;
  /** Staged wallet balance in SOL (the demo wallet is never funded on-chain). */
  balance: number;
  txs: InGameTx[];
  set: (patch: Partial<Pick<ConceptState, 'hostLocked' | 'guestLocked' | 'launching' | 'balance'>>) => void;
  spend: (tx: Omit<InGameTx, 'id' | 'at' | 'signature'>) => InGameTx;
};

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const fakeSignature = () => Array.from({ length: 88 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

export const useConcept = create<ConceptState>((set, get) => ({
  hostLocked: false,
  guestLocked: false,
  launching: false,
  balance: 25,
  txs: [],
  set,
  spend: (tx) => {
    const entry = { ...tx, id: crypto.randomUUID(), at: Date.now(), signature: fakeSignature() };
    set({ balance: Math.round((get().balance - tx.sol) * 1e9) / 1e9, txs: [entry, ...get().txs] } as Partial<ConceptState>);
    return entry;
  },
}));
