import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { ApiError, refreshSession } from '@/lib/api';
import { useSession } from '@/lib/session';
import { SolanaProviders } from '@/features/wallets/solana';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
      refetchOnWindowFocus: false,
    },
  },
});

/** Restores the session from the refresh cookie once on boot. */
const useBootSession = () => {
  useEffect(() => {
    void refreshSession().finally(() => useSession.getState().setReady());
  }, []);
};

export const App = () => {
  useBootSession();
  return (
    <QueryClientProvider client={queryClient}>
      <SolanaProviders>
        <RouterProvider router={router} />
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--color-raised)',
              border: '1px solid var(--color-line-strong)',
              color: 'var(--color-text)',
              fontFamily: 'var(--font-sans)',
            },
          }}
        />
      </SolanaProviders>
    </QueryClientProvider>
  );
};
