import { Navigate, useParams } from 'react-router';
import { useGamerProfile } from '@/lib/queries';
import BreachArmory from './games/BreachArmory';
import Sugarfall from './games/Sugarfall';

/** Games with a staged in-game screen. The real product opens the studio's launch URL. */
export const CONCEPT_PLAYABLE = ['breach-protocol', 'sugarfall'];

/** /concept/play/:slug — stands in for the studio's own site. */
export default function PlayPage() {
  const { slug = '' } = useParams();
  const { data: profile } = useGamerProfile();
  if (slug === 'breach-protocol') return <BreachArmory username={profile?.username ?? 'player'} />;
  if (slug === 'sugarfall') return <Sugarfall />;
  return <Navigate to={`/games/${slug}`} replace />;
}
