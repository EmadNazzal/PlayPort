import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useConcept } from './flag';

type DirectorMessage =
  | { source: 'playport-director'; type: 'navigate'; to: string }
  | { source: 'playport-director'; type: 'invite'; from: string; game: string; stake: number; to: string }
  | { source: 'playport-director'; type: 'state'; patch: { hostLocked?: boolean; guestLocked?: boolean; launching?: boolean } };

/**
 * Lets the demo recording script (tools/demo-video) cue this tab — e.g. deliver player A's
 * invite to player B — without a page reload, so the in-memory session survives.
 */
export const DemoBridge = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const onMessage = (e: MessageEvent<DirectorMessage>) => {
      const msg = e.data;
      // Only the director page embedding this tab may cue it.
      if (e.source !== window.parent || window.parent === window || msg?.source !== 'playport-director') return;
      if (msg.type === 'navigate') navigate(msg.to);
      if (msg.type === 'state') useConcept.getState().set(msg.patch);
      if (msg.type === 'invite') {
        toast(`@${msg.from} challenged you`, {
          description: `${msg.game} · ${msg.stake} SOL each · winner takes the pot`,
          duration: 60_000,
          action: { label: 'View invite', onClick: () => navigate(msg.to) },
        });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [navigate]);
  return null;
};
