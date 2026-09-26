import { useQuery } from '@tanstack/react-query';

const SOL_MINT = 'So11111111111111111111111111111111111111112';

/**
 * Approximate SOL→USD from Jupiter's price API, for the "≈ $" line next to SOL prices.
 * Best-effort: returns null if unreachable, and the UI simply hides the fiat line.
 */
export const useSolPrice = (): number | null => {
  const { data } = useQuery({
    queryKey: ['sol-usd'],
    queryFn: async () => {
      const res = await fetch(`https://lite-api.jup.ag/price/v3?ids=${SOL_MINT}`);
      if (!res.ok) throw new Error('price unavailable');
      const body = (await res.json()) as Record<string, { usdPrice?: number } | undefined>;
      return body[SOL_MINT]?.usdPrice ?? null;
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
  return data ?? null;
};
