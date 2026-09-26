import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, Outlet, ScrollRestoration, useLocation } from 'react-router';
import { Spinner } from '@/components/ui/Spinner';
import { AuthDialog } from '@/features/auth/AuthDialog';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { CommandMenu } from '@/features/market/CommandMenu';
import { MarketLayout } from '@/features/market/MarketLayout';

const StorePage = lazy(() => import('@/features/market/StorePage'));
const BrowsePage = lazy(() => import('@/features/market/BrowsePage'));
const GameDetailPage = lazy(() => import('@/features/market/GameDetailPage'));

const PlayerLayout = lazy(() => import('@/features/player/PlayerLayout'));
const LibraryTab = lazy(() => import('@/features/player/LibraryTab'));
const WalletsTab = lazy(() => import('@/features/player/WalletsTab'));
const PurchasesTab = lazy(() => import('@/features/player/PurchasesTab'));
const ProfileTab = lazy(() => import('@/features/player/ProfileTab'));

const StudioHome = lazy(() => import('@/features/studio/StudioHome'));
const ApplyView = lazy(() => import('@/features/studio/StudioHome').then((m) => ({ default: m.ApplyView })));
const StudioLayout = lazy(() => import('@/features/studio/StudioLayout'));
const StudioGames = lazy(() => import('@/features/studio/StudioGames'));
const GameEditor = lazy(() => import('@/features/studio/GameEditor'));
const StudioSales = lazy(() => import('@/features/studio/StudioSales'));
const StudioTeam = lazy(() => import('@/features/studio/StudioTeam'));
const StudioSettings = lazy(() => import('@/features/studio/StudioSettings'));

const PageFallback = () => (
  <div className="grid min-h-[50vh] place-items-center text-muted">
    <Spinner className="size-5" />
  </div>
);

const page = (node: ReactNode) => <Suspense fallback={<PageFallback />}>{node}</Suspense>;
const authed = (node: ReactNode) => <RequireAuth>{page(node)}</RequireAuth>;

/** Old /market/... links (from before the landing page was dropped) keep working. */
const LegacyMarket = () => {
  const { pathname, search } = useLocation();
  return <Navigate to={`${pathname.replace(/^\/market/, '') || '/'}${search}`} replace />;
};

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
      {
        element: <MarketLayout />,
        children: [
          { path: '/', element: page(<StorePage />) },
          { path: '/browse', element: page(<BrowsePage />) },
          { path: '/games/:slug', element: page(<GameDetailPage />) },
          {
            path: '/player',
            element: authed(<PlayerLayout />),
            children: [
              { index: true, element: page(<LibraryTab />) },
              { path: 'wallets', element: page(<WalletsTab />) },
              { path: 'purchases', element: page(<PurchasesTab />) },
              { path: 'profile', element: page(<ProfileTab />) },
            ],
          },
          { path: '/studio', element: authed(<StudioHome />) },
          { path: '/studio/new', element: authed(<ApplyView />) },
          {
            path: '/studio/:partnerId',
            element: authed(<StudioLayout />),
            children: [
              { index: true, element: page(<StudioGames />) },
              { path: 'games/new', element: page(<GameEditor />) },
              { path: 'games/:gameId', element: page(<GameEditor />) },
              { path: 'sales', element: page(<StudioSales />) },
              { path: 'team', element: page(<StudioTeam />) },
              { path: 'settings', element: page(<StudioSettings />) },
            ],
          },
        ],
      },
      { path: '/market/*', element: <LegacyMarket /> },
      { path: '/market', element: <Navigate to="/" replace /> },
      { path: '/library', element: <Navigate to="/player" replace /> },
      { path: '/account', element: <Navigate to="/player/profile" replace /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
