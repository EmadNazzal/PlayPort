import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { keys as appKeys } from '@/lib/queries';
import { useSession } from '@/lib/session';
import type { ApiKey, Member, MemberRole, Partner, Sale, StudioGame } from './types';

const keys = {
  mine: ['studio', 'mine'] as const,
  partner: (id: string) => ['studio', id] as const,
  games: (id: string) => ['studio', id, 'games'] as const,
  members: (id: string) => ['studio', id, 'members'] as const,
  apiKeys: (id: string) => ['studio', id, 'api-keys'] as const,
  sales: (id: string) => ['studio', id, 'sales'] as const,
};

export type PartnerInput = Partial<Omit<Partner, 'id' | 'status' | 'statusReason' | 'createdAt'>>;
export type GameInput = Partial<Omit<StudioGame, 'id' | 'partnerId' | 'status' | 'statusReason' | 'publishedAt' | 'createdAt' | 'updatedAt'>>;

export const useMyStudios = () => {
  const token = useSession((s) => s.token);
  return useQuery({ queryKey: keys.mine, queryFn: () => api<{ partner: Partner; role: MemberRole }[]>('/partners/mine'), enabled: Boolean(token) });
};

export const useStudio = (id: string) => useQuery({ queryKey: keys.partner(id), queryFn: () => api<Partner>(`/partners/${id}`) });

export const useStudioGames = (id: string) =>
  useQuery({ queryKey: keys.games(id), queryFn: () => api<StudioGame[]>(`/games/manage?partnerId=${id}`) });

export const useApplyStudio = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PartnerInput) => api<Partner>('/partners', { method: 'POST', body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.mine });
      void qc.invalidateQueries({ queryKey: appKeys.me }); // gained the partner role
    },
  });
};

export const useUpdateStudio = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PartnerInput) => api<Partner>(`/partners/${id}`, { method: 'PATCH', body }),
    onSuccess: (partner) => {
      qc.setQueryData(keys.partner(id), partner);
      void qc.invalidateQueries({ queryKey: keys.mine });
    },
  });
};

const useGamesMutation = <V>(partnerId: string, fn: (vars: V) => Promise<StudioGame>) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.games(partnerId) });
      void qc.invalidateQueries({ queryKey: ['games'] }); // public catalogue
    },
  });
};

export const useCreateGame = (partnerId: string) =>
  useGamesMutation(partnerId, (body: GameInput) => api<StudioGame>('/games', { method: 'POST', body: { ...body, partnerId } }));

export const useUpdateGame = (partnerId: string) =>
  useGamesMutation(partnerId, ({ id, ...body }: GameInput & { id: string }) => api<StudioGame>(`/games/${id}`, { method: 'PATCH', body }));

export const useSubmitGame = (partnerId: string) => useGamesMutation(partnerId, (id: string) => api<StudioGame>(`/games/${id}/submit`, { method: 'POST' }));

export const useArchiveGame = (partnerId: string) => useGamesMutation(partnerId, (id: string) => api<StudioGame>(`/games/${id}/archive`, { method: 'POST' }));

export const useMembers = (id: string) => useQuery({ queryKey: keys.members(id), queryFn: () => api<Member[]>(`/partners/${id}/members`) });

export const useAddMember = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; role: MemberRole }) => api<Member[]>(`/partners/${id}/members`, { method: 'POST', body }),
    onSuccess: (members) => qc.setQueryData(keys.members(id), members),
  });
};

export const useRemoveMember = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api<void>(`/partners/${id}/members/${userId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.members(id) }),
  });
};

export const useApiKeys = (id: string, enabled: boolean) =>
  useQuery({ queryKey: keys.apiKeys(id), queryFn: () => api<ApiKey[]>(`/partners/${id}/api-keys`), enabled });

export const useCreateApiKey = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; scopes: string[] }) => api<ApiKey & { key: string }>(`/partners/${id}/api-keys`, { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.apiKeys(id) }),
  });
};

export const useRevokeApiKey = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => api<void>(`/partners/${id}/api-keys/${keyId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.apiKeys(id) }),
  });
};

export const useSales = (id: string, enabled: boolean) =>
  useQuery({ queryKey: keys.sales(id), queryFn: () => api<Sale[]>(`/payments/partner?partnerId=${id}`), enabled, retry: false });
