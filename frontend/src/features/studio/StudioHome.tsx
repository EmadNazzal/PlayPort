import { ArrowRight, Building2, Check } from 'lucide-react';
import { Link, Navigate } from 'react-router';
import { Spinner } from '@/components/ui/Spinner';
import { ApplyForm } from './ApplyForm';
import { useMyStudios } from './queries';
import { StatusBadge } from './StatusBadge';

const PERKS = [
  'Keep your game on your own servers — players launch it from your URL.',
  'Get paid in SOL straight to your payout wallet. PlayPort never holds funds.',
  'Invite your team and automate with scoped API keys.',
];

/** /studio — apply to become a partner, or jump into your studio. */
export default function StudioHome() {
  const { data: studios, isPending } = useMyStudios();

  if (isPending) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-muted">
        <Spinner className="size-5" />
      </div>
    );
  }
  if (studios?.length === 1) return <Navigate to={`/studio/${studios[0]!.partner.id}`} replace />;

  if (studios && studios.length > 1) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-8">
        <p className="eyebrow mb-2">Studio</p>
        <h1 className="text-[clamp(2rem,4vw,3rem)] leading-none font-bold tracking-[-0.035em] [font-variation-settings:'wdth'_85]">Your studios</h1>
        <ul className="mt-8 divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {studios.map(({ partner, role }) => (
            <li key={partner.id}>
              <Link to={`/studio/${partner.id}`} className="flex items-center gap-4 bg-surface px-5 py-4 transition-colors duration-150 hover:bg-hover">
                <span className="grid size-10 place-items-center rounded-xl bg-veil/[0.06] font-display font-bold">{partner.name.slice(0, 1)}</span>
                <span className="flex-1">
                  <span className="block font-medium">{partner.name}</span>
                  <span className="block text-xs text-muted capitalize">{role}</span>
                </span>
                <StatusBadge status={partner.status} />
                <ArrowRight className="size-4 text-faint" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return <ApplyView />;
}

/** The pitch + application form. Also served at /studio/new for adding another studio. */
export function ApplyView() {
  return (
    <div className="mx-auto grid max-w-[1200px] gap-12 px-4 pt-10 sm:px-8 lg:grid-cols-[1fr_1.1fr]">
      <div className="lg:pt-6">
        <span className="grid size-12 place-items-center rounded-2xl bg-lantern/12 text-lantern-fg">
          <Building2 className="size-6" />
        </span>
        <p className="eyebrow mt-6 mb-3">For studios</p>
        <h1 className="text-[clamp(2.4rem,5vw,4rem)] leading-[0.92] font-bold tracking-[-0.04em] [font-variation-settings:'wdth'_80]">
          Open a stall
          <br />
          <span className="text-muted">in the night market.</span>
        </h1>
        <ul className="mt-8 space-y-4">
          {PERKS.map((p) => (
            <li key={p} className="flex gap-3 text-muted">
              <Check className="mt-0.5 size-4 shrink-0 text-go-fg" /> {p}
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-faint">Applications are reviewed by the PlayPort team. You can start adding games while you wait.</p>
      </div>
      <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
        <h2 className="font-display text-xl font-semibold tracking-[-0.02em]">Studio application</h2>
        <p className="mt-1 text-sm text-muted">Tell players who you are. You can change all of this later.</p>
        <div className="mt-6">
          <ApplyForm />
        </div>
      </div>
    </div>
  );
}
