import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { Spinner } from '@/components/ui/Spinner';
import { useSession } from '@/lib/session';
import { useAuthDialog } from './authDialogStore';

/** Waits for the boot refresh, then either renders or sends the visitor to sign in. */
export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { token, ready } = useSession();
  const location = useLocation();

  useEffect(() => {
    if (ready && !token) useAuthDialog.getState().show({ returnTo: location.pathname });
  }, [ready, token, location.pathname]);

  if (!ready) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-muted">
        <Spinner className="size-5" />
      </div>
    );
  }
  return token ? children : <Navigate to="/market" replace />;
};
