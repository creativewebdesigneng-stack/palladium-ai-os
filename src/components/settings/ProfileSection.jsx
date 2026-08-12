import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { User } from 'lucide-react';
import { Panel, Field, TextInput } from './shared';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { friendlyMessage } from '@/lib/errors';
import { getWorkspace } from '@/lib/platform/platform.functions';
import { updateMyProfile } from '@/lib/billing/billing.functions';

export default function ProfileSection() {
  const qc = useQueryClient();
  const workspaceFn = useServerFn(getWorkspace);
  const updateProfileFn = useServerFn(updateMyProfile);

  const [session, setSession] = useState('unknown');
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => { if (alive) setSession(data.session ? 'yes' : 'no'); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ? 'yes' : 'no'));
    return () => { alive = false; sub?.subscription?.unsubscribe(); };
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['settings-profile'],
    queryFn: () => workspaceFn({ data: {} }),
    enabled: session === 'yes',
    retry: false,
  });

  const [fullName, setFullName] = useState('');
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (data?.profile) setFullName(data.profile.full_name ?? '');
  }, [data?.profile]);

  const mutation = useMutation({
    mutationFn: (value) => updateProfileFn({ data: { fullName: value } }),
    onSuccess: () => {
      toast({ title: 'Profile updated' });
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['settings-profile'] });
    },
    onError: (err) => {
      console.error('[settings/profile]', err);
      toast({ title: 'Could not save profile', description: friendlyMessage(err), variant: 'destructive' });
    },
  });

  const profile = data?.profile ?? null;
  const initials = (fullName || profile?.email || '?')
    .split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <Panel icon={User} title="Profile" grad="from-violet-500 to-indigo-500" desc="Your public identity across PalladiumAI.">
      {session === 'no' && (
        <p className="text-xs text-zinc-500">Sign in to manage your profile.</p>
      )}

      {session === 'unknown' || (session === 'yes' && isLoading) ? (
        <div className="animate-pulse space-y-3">
          <div className="h-16 w-16 rounded-2xl bg-white/5" />
          <div className="h-9 rounded-xl bg-white/5" />
          <div className="h-9 rounded-xl bg-white/5" />
        </div>
      ) : session === 'yes' && error ? (
        <p className="text-xs text-red-300">{friendlyMessage(error)}</p>
      ) : session === 'yes' ? (
        <>
          <div className="mb-5 flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 text-xl font-semibold text-white">
              {initials || '?'}
            </div>
            <p className="text-[10px] text-zinc-600">Avatar uploads aren't configured yet.</p>
          </div>

          <div className="space-y-4">
            <Field label="Name">
              <TextInput value={fullName} onChange={(v) => { setFullName(v); setDirty(true); }} placeholder="Your full name" />
            </Field>
            <Field label="Email" hint="Managed by your account provider.">
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-500">
                {profile?.email ?? '—'}
              </div>
            </Field>
          </div>

          <div className="mt-5 flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-[11px] text-zinc-500">{dirty ? 'You have unsaved changes' : 'All changes saved'}</p>
            <button
              onClick={() => mutation.mutate(fullName.trim())}
              disabled={!dirty || !fullName.trim() || mutation.isPending}
              className={`rounded-xl px-5 py-2 text-sm font-medium ${dirty && fullName.trim() ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-900/30 hover:opacity-90' : 'cursor-not-allowed border border-white/10 text-zinc-500'}`}>
              {mutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </>
      ) : null}
    </Panel>
  );
}
