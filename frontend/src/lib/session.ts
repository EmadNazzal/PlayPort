import { create } from 'zustand';

/**
 * The access token lives in memory only — never localStorage — so XSS can't lift a
 * long-lived credential. The refresh token is an httpOnly cookie the page can't read.
 */
type SessionState = {
  token: string | null;
  /** False until the first silent refresh on boot has settled. */
  ready: boolean;
  setToken: (token: string | null) => void;
  setReady: () => void;
};

export const useSession = create<SessionState>((set) => ({
  token: null,
  ready: false,
  setToken: (token) => set({ token }),
  setReady: () => set({ ready: true }),
}));
