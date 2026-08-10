import { useState, useEffect } from 'react';
import { Shield, Loader2, Lock } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { SECURITY_FIELDS } from './toolsData';

// Admin security panel. Toggles update Organisation.settings.security via the
// toggleTool function. Non-admins see a read-only summary.
export default function SecurityPanel({ security, loading, isAdmin, onSave }) {
  const [local, setLocal] = useState(security);
  const [saving, setSaving] = useState(false);
  useEffect(() => setLocal(security), [security]);

  const toggle = (key) => setLocal((s) => ({ ...s, [key]: !s[key] }));
  const save = async () => { setSaving(true); try { await onSave(local); } finally { setSaving(false); } };

  return (
    <>
      <PageHeader eyebrow="Framework" title="Security & Admin" description="Control which tool capabilities are allowed across your organisation." />
      {loading ? (
        <div className="flex items-center justify-center py-16 text-zinc-500"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <div className="mx-auto max-w-2xl pglass rounded-2xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-violet-300" />
            <p className="text-sm font-semibold text-white">Tool security policy</p>
          </div>
          <div className="space-y-3">
            {SECURITY_FIELDS.map((f) => (
              <label key={f.key} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[.02] px-3 py-2.5">
                <div>
                  <p className="text-xs font-medium text-white">{f.label}</p>
                  <p className="text-[11px] text-zinc-500">{f.desc}</p>
                </div>
                <input type="checkbox" checked={!!local[f.key]} onChange={() => isAdmin && toggle(f.key)} disabled={!isAdmin} className="h-4 w-4 accent-violet-500" />
              </label>
            ))}
          </div>
          {isAdmin ? (
            <button onClick={save} disabled={saving} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-violet-500 px-3.5 py-2 text-xs font-medium text-white hover:bg-violet-600 disabled:opacity-50">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}Save security policy
            </button>
          ) : (
            <p className="mt-4 text-[11px] text-zinc-500">Only admins can change security settings.</p>
          )}
        </div>
      )}
    </>
  );
}