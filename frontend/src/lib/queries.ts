import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { useSession } from './session';
import type { Game, GamerProfile, Genre, LibraryItem, Me, Payment, TokenResponse, Wallet } from './types';

export const keys = {
  me: ['me'] as const,
  gamer: ['gamer', 'me'] as const,
  library: ['library'] as const,
  wallets: ['wallets'] as const,
  payments: ['payments'] as const,
  games: (filter: CatalogFilter) => ['games', filter] as const,
  game: (slug: string) => ['game', slug] as const,
  genres: ['genres'] as const,
};

export type CatalogFilter = {
  search?: string;
  genre?: string;
  partner?: string;
  price?: 'free' | 'paid';
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'title';
  limit?: number;
};

const qs = (params: Record<string, string | number | undefined>) => {
  const entries = Object.entries(params).filter((e): e is [string, string | number] => e[1] !== undefined && e[1] !== '');
  return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}` : '';
};

// ----- session -----

export const useMe = () => {
  const token = useSession((s) => s.token);
  return useQuery({ queryKey: keys.me, queryFn: () => api<Me>('/auth/me'), enabled: Boolean(token), staleTime: 60_000 });
};

/** Stores the token and primes the `me` query so the UI flips to signed-in without a flash. */
export const useSignedIn = () => {
  const qc = useQueryClient();
  return async (tokens: TokenResponse) => {
    useSession.getState().setToken(tokens.accessToken);
    await qc.fetchQuery({ queryKey: keys.me, queryFn: () => api<Me>('/auth/me') });
  };
};

export const useSignOut = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST', body: {} }),
    onSettled: () => {
      useSession.getState().setToken(null);
      qc.clear();
    },
  });
};

// ----- catalog -----

export const useGames = (filter: CatalogFilter = {}) =>
  useQuery({
    queryKey: keys.games(filter),
    queryFn: ({ signal }) => api<Game[]>(`/games${qs({ limit: 60, ...filter })}`, { signal }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

export const useGame = (slug: string) =>
  useQuery({ queryKey: keys.game(slug), queryFn: () => api<Game>(`/games/${slug}`), staleTime: 30_000 });

export const useGenres = () => useQuery({ queryKey: keys.genres, queryFn: () => api<Genre[]>('/games/genres'), staleTime: 5 * 60_000 });

// ----- gamer -----

export const useGamerProfile = () => {
  const token = useSession((s) => s.token);
  return useQuery({ queryKey: keys.gamer, queryFn: () => api<GamerProfile>('/gamers/me'), enabled: Boolean(token), retry: false });
};

export const useLibrary = () => {
  const token = useSession((s) => s.token);
  return useQuery({ queryKey: keys.library, queryFn: () => api<LibraryItem[]>('/gamers/me/library'), enabled: Boolean(token), retry: false });
};

export const useWallets = () => {
  const token = useSession((s) => s.token);
  return useQuery({ queryKey: keys.wallets, queryFn: () => api<Wallet[]>('/wallets'), enabled: Boolean(token), retry: false });
};

export const usePayments = () => {
  const token = useSession((s) => s.token);
  return useQuery({ queryKey: keys.payments, queryFn: () => api<Payment[]>('/payments'), enabled: Boolean(token), retry: false });
};

export const useClaimGame = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (gameId: string) => api(`/games/${gameId}/claim`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.library }),
  });
};

export const useUpdateWallet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; label?: string | null; isPrimary?: true }) =>
      api<Wallet>(`/wallets/${id}`, { method: 'PATCH', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.wallets }),
  });
};

export const useUnlinkWallet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/wallets/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.wallets }),
  });
};

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Pick<GamerProfile, 'username' | 'displayName' | 'bio' | 'country'>>) =>
      api<GamerProfile>('/gamers/me', { method: 'PATCH', body }),
    onSuccess: (data) => {
      qc.setQueryData(keys.gamer, data);
      void qc.invalidateQueries({ queryKey: keys.me });
    },
  });
};
