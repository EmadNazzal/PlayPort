import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useGamerProfile, useUpdateProfile } from '@/lib/queries';

const inputClass =
  'h-11 w-full rounded-xl border border-line-strong bg-ink-2 px-3.5 text-[15px] outline-none placeholder:text-faint focus:border-go/60 focus:shadow-[0_0_0_3px_rgb(20_241_149/0.15)]';

const Profile = () => {
  const { data: profile } = useGamerProfile();
  const update = useUpdateProfile();
  const [form, setForm] = useState({ username: '', displayName: '', bio: '' });

  useEffect(() => {
    if (profile) setForm({ username: profile.username, displayName: profile.displayName ?? '', bio: profile.bio ?? '' });
  }, [profile]);

  if (!profile) return <p className="text-sm text-muted">This account has no gamer profile.</p>;

  const save = (e: FormEvent) => {
    e.preventDefault();
    update.mutate(
      { username: form.username, displayName: form.displayName || undefined, bio: form.bio || null },
      { onSuccess: () => toast.success('Profile saved'), onError: (err) => toast.error(errorMessage(err)) },
    );
  };

  return (
    <form onSubmit={save} className="grid max-w-xl gap-4">
      <label className="block">
        <span className="mb-1.5 block text-[13px] text-muted">Username</span>
        <input className={inputClass} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[13px] text-muted">Display name</span>
        <input className={inputClass} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[13px] text-muted">Bio</span>
        <textarea rows={3} className={cn(inputClass, 'h-auto py-3')} value={form.bio} maxLength={500} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
      </label>
      <div>
        <Button type="submit" intent="primary" loading={update.isPending}>
          Save profile
        </Button>
      </div>
    </form>
  );
};

export default function ProfileTab() {
  return (
    <div className="max-w-3xl">
      <p className="mb-6 text-sm text-muted">How other players see you.</p>
      <Profile />
    </div>
  );
}
