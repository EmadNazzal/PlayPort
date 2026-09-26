import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, Outlet, ScrollRestoration } from 'react-router';
import { Spinner } from '@/components/ui/Spinner';
import { AuthDialog } from '@/features/auth/AuthDialog';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { CommandMenu } from '@/features/market/CommandMenu';
import { MarketLayout } from '@/features/market/MarketLayout';

const LandingPage = lazy(() => import('@/features/landing/LandingPage'));
const StorePage = lazy(() => import('@/features/market/StorePage'));
const BrowsePage = lazy(() => import('@/features/market/BrowsePage'));
const GameDetailPage = lazy(() => import('@/features/market/GameDetailPage'));
const LibraryPage = lazy(() => import('@/features/library/LibraryPage'));
const AccountPage = lazy(() => import('@/features/account/AccountPage'));

const PageFallback = () => (
  <div className="grid min-h-[60vh] place-items-center text-muted">
    <Spinner className="size-5" />
  </div>
);

const page = (node: ReactNode) => <Suspense fallback={<PageFallback />}>{node}</Suspense>;

const Root = () => (
  <>
    <Outlet />
    <AuthDialog />
    <CommandMenu />
    <ScrollRestoration />
  </>
);

export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { path: '/', element: page(<LandingPage />) },
      {
        element: <MarketLayout />,
        children: [
          { path: '/market', element: page(<StorePage />) },
          { path: '/market/browse', element: page(<BrowsePage />) },
          { path: '/market/games/:slug', element: page(<GameDetailPage />) },
          { path: '/library', element: <RequireAuth>{page(<LibraryPage />)}</RequireAuth> },
          { path: '/account', element: <RequireAuth>{page(<AccountPage />)}</RequireAuth> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
