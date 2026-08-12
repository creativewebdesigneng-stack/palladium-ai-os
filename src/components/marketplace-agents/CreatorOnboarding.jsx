import { useState } from 'react';
import { Rocket, Loader2 } from 'lucide-react';
import { saveCreatorProfile } from './api';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';

const inp = 'w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none';

// Become-a-creator form, or edit an existing creator profile. Creates a Creator
// record (RLS create = own user_id) so the user has a public profile page.
export default function CreatorOnboarding({ existing, onCreated }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState(
    existing
      ? { name: existing.display_name || '', handle: existing.handle || '', bio: existing.bio || '', website: existing.website || '', avatar_url: existing.avatar_url || '' }
      : { name: user?.full_name || '', handle: '', bio: '', website: '', avatar_url: '' }
  );
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || busy) return;
    setBusy(true);
    try {
      await saveCreatorProfile({
        display_name: form.name,
        handle: form.handle || undefined,
        bio: form.bio || undefined,
        website: form.website || '',
        avatar_url: form.avatar_url || '',
      });
      toast({ title: existing ? 'Profile updated' : 'Welcome to PalladiumAI Creators' });
      onCreated?.();
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/[.04] to-transparent p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500"><Rocket className="h-5 w-5 text-white" /></span>
        <div>
          <h3 className="text-base font-semibold text-white">{existing ? 'Creator profile' : 'Become a creator'}</h3>
          <p className="text-xs text-zinc-500">{existing ? 'Update your public creator profile.' : 'Publish your AI agents to the PalladiumAI marketplace.'}</p>
        </div>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Display name"><input value={form.name} onChange={(e) => set('name', e.target.value)} required className={inp} /></Field>
          <Field label="Handle"><input value={form.handle} onChange={(e) => set('handle', e.target.value)} placeholder="@brandforge" className={inp} /></Field>
        </div>
        <Field label="Bio"><textarea value={form.bio} onChange={(e) => set('bio', e.target.value)} rows={3} className={`${inp} resize-none`} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Website"><input value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://" className={inp} /></Field>
          <Field label="Avatar URL"><input value={form.avatar_url} onChange={(e) => set('avatar_url', e.target.value)} placeholder="https://" className={inp} /></Field>
        </div>
        <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
          {existing ? 'Save profile' : 'Create creator profile'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="mb-1.5 block text-[11px] font-medium text-zinc-400">{label}</label>{children}</div>;
}