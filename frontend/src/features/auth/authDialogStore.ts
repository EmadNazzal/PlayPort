import { create } from 'zustand';

type Mode = 'signin' | 'signup';
type Tab = 'wallet' | 'email';

type AuthDialogState = {
  open: boolean;
  mode: Mode;
  tab: Tab;
  /** Where to go after signing in. */
  returnTo: string;
  show: (opts?: Partial<Pick<AuthDialogState, 'mode' | 'tab' | 'returnTo'>>) => void;
  setOpen: (open: boolean) => void;
  setMode: (mode: Mode) => void;
  setTab: (tab: Tab) => void;
};

export const useAuthDialog = create<AuthDialogState>((set) => ({
  open: false,
  mode: 'signin',
  tab: 'wallet',
  returnTo: '/market',
  show: (opts = {}) => set({ open: true, mode: 'signin', tab: 'wallet', returnTo: '/market', ...opts }),
  setOpen: (open) => set({ open }),
  setMode: (mode) => set({ mode }),
  setTab: (tab) => set({ tab }),
}));
