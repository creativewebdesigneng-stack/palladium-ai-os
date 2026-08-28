import { useCallback, useEffect, useState } from 'react';
import { Bot, Download, KeyRound, Loader2, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { Panel } from './shared';
import {
  createBrowserCredential,
  deleteBrowserCredential,
  getBrowserArtifactUrl,
  listBrowserArtifacts,
  listBrowserCredentials,
} from '@/lib/runtime/browser-automation.functions';

const EMPTY = { name: '', domain: '', username: '', password: '', totp_secret: '', totp_identifier: '' };

function Field({ label, type = 'text', value, onChange, placeholder, autoComplete = 'off' }) {
  return (
    <label className="space-y-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete}
        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
    </label>
  );
}

export default function BrowserAutomationSection() {
  const [credentials, setCredentials] = useState([]);
  const [artifacts, setArtifacts] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [credentialResult, artifactResult] = await Promise.all([
        listBrowserCredentials({ data: {} }),
        listBrowserArtifacts({ data: { limit: 50 } }),
      ]);
      setCredentials(credentialResult?.credentials ?? []);
      setArtifacts(artifactResult?.artifacts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load browser automation settings.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true); setError(''); setNotice('');
    try {
      await createBrowserCredential({ data: form });
      setForm(EMPTY);
      setNotice('Browser credential encrypted and saved. Secret values will not be shown again.');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save browser credential.');
    } finally { setSaving(false); }
  };

  const removeCredential = async (id) => {
    setError(''); setNotice('');
    try {
      await deleteBrowserCredential({ data: { id } });
      setNotice('Browser credential deleted.');
      await reload();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not delete browser credential.'); }
  };

  const downloadArtifact = async (id) => {
    setError('');
    try {
      const result = await getBrowserArtifactUrl({ data: { id } });
      if (!result?.signed_url) throw new Error('No private download URL was returned.');
      window.open(result.signed_url, '_blank', 'noopener,noreferrer');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not open browser artifact.'); }
  };

  return (
    <div className="space-y-4">
      <Panel icon={Bot} title="Browser Automation" grad="from-violet-500 to-fuchsia-500" desc="Secure logins, TOTP and private browser artifacts for resilient AI-agent web tasks.">
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[.06] p-4 text-xs leading-5 text-zinc-300">
          <div className="flex items-center gap-2 font-medium text-emerald-300"><ShieldCheck className="h-4 w-4" /> Secrets stay outside the model</div>
          <p className="mt-1 text-zinc-400">Passwords and authenticator secrets are encrypted server-side. Agents receive only an opaque credential id; decrypted values are injected directly into the trusted browser session.</p>
        </div>

        {error && <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/[.06] px-3 py-2 text-xs text-red-300">{error}</div>}
        {notice && <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/[.06] px-3 py-2 text-xs text-emerald-300">{notice}</div>}

        <form onSubmit={save} className="mt-4 space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-white"><Plus className="h-4 w-4" /> Add stored website login</div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Name" value={form.name} onChange={set('name')} placeholder="Shopify admin" />
            <Field label="Domain" value={form.domain} onChange={set('domain')} placeholder="admin.shopify.com" />
            <Field label="Username / email" value={form.username} onChange={set('username')} placeholder="owner@example.com" autoComplete="off" />
            <Field label="Password" type="password" value={form.password} onChange={set('password')} placeholder="Saved encrypted" autoComplete="new-password" />
            <Field label="TOTP secret (optional)" type="password" value={form.totp_secret} onChange={set('totp_secret')} placeholder="Authenticator setup secret" autoComplete="off" />
            <Field label="TOTP account label (optional)" value={form.totp_identifier} onChange={set('totp_identifier')} placeholder="owner@example.com" />
          </div>
          <p className="text-[11px] leading-5 text-zinc-500">The TOTP setup secret is encrypted like the password. PalladiumAI generates the current code inside the trusted runtime when an agent signs in.</p>
          <button disabled={saving || !form.name || !form.domain || (!form.username && !form.password && !form.totp_secret)}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />} Encrypt & save
          </button>
        </form>
      </Panel>

      <Panel icon={KeyRound} title="Stored Browser Logins" grad="from-sky-500 to-violet-500" desc="Only configuration status is displayed. Stored secret values are never returned to this page.">
        {loading ? <div className="flex items-center gap-2 py-5 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div> : credentials.length === 0 ?
          <p className="py-4 text-sm text-zinc-500">No stored browser logins yet.</p> :
          <div className="space-y-2">
            {credentials.map((credential) => (
              <div key={credential.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                <div><p className="text-sm font-medium text-white">{credential.name}</p><p className="mt-0.5 text-xs text-zinc-500">{credential.domain}</p></div>
                <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                  {credential.has_username && <span className="rounded-full border border-white/10 px-2 py-1">username</span>}
                  {credential.has_password && <span className="rounded-full border border-white/10 px-2 py-1">password</span>}
                  {credential.has_totp && <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-1 text-violet-300">TOTP</span>}
                  <button onClick={() => void removeCredential(credential.id)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-300" aria-label={`Delete ${credential.name}`}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>}
      </Panel>

      <Panel icon={Download} title="Browser Artifacts" grad="from-cyan-500 to-emerald-500" desc="Files captured by browser agents are private and opened through short-lived signed links.">
        {loading ? <div className="flex items-center gap-2 py-5 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div> : artifacts.length === 0 ?
          <p className="py-4 text-sm text-zinc-500">No browser downloads have been captured yet.</p> :
          <div className="space-y-2">
            {artifacts.map((artifact) => (
              <div key={artifact.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="min-w-0"><p className="truncate text-sm font-medium text-white">{artifact.filename}</p><p className="mt-0.5 text-[11px] text-zinc-500">{artifact.mime_type || 'file'} · {Math.max(1, Math.ceil(Number(artifact.size_bytes || 0) / 1024))} KB</p></div>
                <button onClick={() => void downloadArtifact(artifact.id)} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-xs text-white hover:bg-white/[.08]"><Download className="h-3.5 w-3.5" /> Open</button>
              </div>
            ))}
          </div>}
      </Panel>
    </div>
  );
}
