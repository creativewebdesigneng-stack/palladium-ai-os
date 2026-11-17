import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { Panel, Field, Select, SaveBar } from './shared';
import { supabase } from '@/integrations/supabase/client';

const DEFAULTS = { locale: 'en-GB', timezone: 'Europe/London', currency: 'GBP' };

export default function AccountSection() {
  const [session, setSession] = useState('unknown');
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [preferences, setPreferences] = useState(DEFAULTS);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data, error: authError }) => {
      if (!alive) return;
      if (authError || !data.user) { setSession('no'); setLoading(false); return; }
      setSession('yes');
      setEmail(data.user.email ?? '');
      setPreferences({ ...DEFAULTS, ...(data.user.user_metadata?.blackstar_account ?? {}) });
      setLoading(false);
    }).catch(() => { if (alive) { setSession('no'); setLoading(false); } });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, user) => {
      if (!alive) return;
      setSession(user ? 'yes' : 'no');
      setEmail(user?.email ?? '');
      if (user) setPreferences({ ...DEFAULTS, ...(user.user_metadata?.blackstar_account ?? {}) });
    });
    return () => { alive = false; sub?.subscription?.unsubscribe(); };
  }, []);

  const update = (key, value) => { setPreferences((current) => ({ ...current, [key]: value })); setDirty(true); };

  const save = async () => {
    setSaving(true); setError('');
    try {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user) throw authError ?? new Error('Sign in again to save account preferences.');
      const { error: saveError } = await supabase.auth.updateUser({ data: { ...data.user.user_metadata, blackstar_account: preferences } });
      if (saveError) throw saveError;
      setDirty(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save account preferences.'); }
    finally { setSaving(false); }
  };

  return (
    <Panel icon={Globe} title="Account" grad="from-sky-500 to-cyan-500" desc="Regional and display preferences for your account.">
      {session === 'no' ? <p className="text-xs text-zinc-500">Sign in to manage account preferences.</p> :
        loading ? <p role="status" className="text-xs text-zinc-500">Loading account preferences…</p> : (
          <>
            <div className="space-y-4">
              <Field label="Account email" hint="Managed by your sign-in provider."><div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-500">{email || '—'}</div></Field>
              <Field label="Language"><Select value={preferences.locale} onChange={(value) => update('locale', value)} options={['en-GB','en-US','fr-FR','de-DE']} /></Field>
              <Field label="Time zone"><Select value={preferences.timezone} onChange={(value) => update('timezone', value)} options={['Europe/London','UTC','Europe/Paris','America/New_York','America/Los_Angeles','Asia/Tokyo']} /></Field>
              <Field label="Currency"><Select value={preferences.currency} onChange={(value) => update('currency', value)} options={['GBP','USD','EUR']} /></Field>
            </div>
            <p className="mt-3 text-[10px] text-zinc-600">These preferences are saved to your authenticated account metadata. They do not change your legal entity, billing address, subscription currency or payment provider settings.</p>
            {error && <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
            <div className="mt-4"><SaveBar dirty={dirty && !saving} onSave={save} /></div>
          </>
        )}
    </Panel>
  );
}
