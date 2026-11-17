import { useEffect, useState } from 'react';
import { Palette } from 'lucide-react';
import { Panel, Field, Select, ToggleRow, SaveBar } from './shared';
import { supabase } from '@/integrations/supabase/client';

const DEFAULTS = { accent: 'violet', density: 'comfortable', dim: false };
const ACCENTS = { violet: '263 70% 58%', cyan: '187 85% 53%', emerald: '158 64% 45%', rose: '347 77% 55%' };

function applyAppearance(preferences) {
  if (typeof document === 'undefined') return;
  const accent = ACCENTS[preferences.accent] ?? ACCENTS.violet;
  const root = document.documentElement;
  root.style.setProperty('--primary', accent);
  root.style.setProperty('--ring', accent);
  root.style.setProperty('--sidebar-primary', accent);
  root.style.setProperty('--chart-1', accent);
  root.style.fontSize = preferences.density === 'compact' ? '14px' : '16px';
  document.body.classList.toggle('palladium-dim', Boolean(preferences.dim));
}

export default function AppearanceSection() {
  const [session, setSession] = useState('unknown');
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState(DEFAULTS);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data, error: authError }) => {
      if (!alive) return;
      if (authError || !data.user) { setSession('no'); setLoading(false); return; }
      const saved = { ...DEFAULTS, ...(data.user.user_metadata?.blackstar_appearance ?? {}) };
      setSession('yes'); setPreferences(saved); applyAppearance(saved); setLoading(false);
    }).catch(() => { if (alive) { setSession('no'); setLoading(false); } });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, user) => {
      if (!alive) return;
      setSession(user ? 'yes' : 'no');
      if (user) {
        const saved = { ...DEFAULTS, ...(user.user_metadata?.blackstar_appearance ?? {}) };
        setPreferences(saved); applyAppearance(saved);
      }
    });
    return () => { alive = false; sub?.subscription?.unsubscribe(); };
  }, []);

  useEffect(() => { if (session === 'yes') applyAppearance(preferences); }, [preferences, session]);
  const update = (key, value) => { setPreferences((current) => ({ ...current, [key]: value })); setDirty(true); };

  const save = async () => {
    setSaving(true); setError('');
    try {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user) throw authError ?? new Error('Sign in again to save appearance preferences.');
      const { error: saveError } = await supabase.auth.updateUser({ data: { ...data.user.user_metadata, blackstar_appearance: preferences } });
      if (saveError) throw saveError;
      setDirty(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save appearance preferences.'); }
    finally { setSaving(false); }
  };

  return (
    <Panel icon={Palette} title="Appearance" grad="from-fuchsia-500 to-pink-500" desc="Personalise the Blackstar interface.">
      {session === 'no' ? <p className="text-xs text-zinc-500">Sign in to manage appearance preferences.</p> :
        loading ? <p role="status" className="text-xs text-zinc-500">Loading appearance preferences…</p> : (
          <>
            <div className="space-y-4">
              <Field label="Theme" hint="Dark is the currently supported application theme."><div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-400">Dark</div></Field>
              <Field label="Accent colour"><Select value={preferences.accent} onChange={(value) => update('accent', value)} options={['violet','cyan','emerald','rose']} /></Field>
              <Field label="Layout density"><Select value={preferences.density} onChange={(value) => update('density', value)} options={['comfortable','compact']} /></Field>
              <ToggleRow label="Dim display" desc="Reduce saturation and brightness across the interface." checked={preferences.dim} onChange={(value) => update('dim', value)} />
            </div>
            <p className="mt-3 text-[10px] text-zinc-600">Changes preview immediately and are saved to your authenticated account metadata.</p>
            {error && <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
            <div className="mt-4"><SaveBar dirty={dirty && !saving} onSave={save} /></div>
          </>
        )}
    </Panel>
  );
}
