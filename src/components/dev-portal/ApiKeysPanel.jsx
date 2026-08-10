import { useEffect, useState } from 'react';
import { KeyRound, Plus, RotateCw, X, Copy, Check, Loader2 } from 'lucide-react';
import { listApiKeys, createApiKey, rotateApiKey, revokeApiKey } from './api';
import { KEY_STATUS_STYLE } from './devPortalData';

const ENV_STYLE = { live: 'text-emerald-400 bg-emerald-400/10', test: 'text-sky-400 bg-sky-400/10' };

export default function ApiKeysPanel({ onToast }) {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', environment: 'live', scopes: ['agents:read', 'agents:run', 'tasks:read'] });
  const [newKey, setNewKey] = useState(null);
  const [copied, setCopied] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await listApiKeys();
      setKeys(data.keys || []);
    } catch (e) { onToast?.(e.message || 'Failed to load keys'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const toggleScope = (s) => setForm((f) => ({ ...f, scopes: f.scopes.includes(s) ? f.scopes.filter((x) => x !== s) : [...f.scopes, s] }));

  const create = async () => {
    if (!form.name.trim()) return;
    try {
      setBusy(true);
      const data = await createApiKey(form.name.trim(), form.environment, form.scopes);
      setNewKey(data);
      onToast?.('Key created — copy it now, it won\'t be shown again');
      setForm({ name: '', environment: 'live', scopes: ['agents:read', 'agents:run', 'tasks:read'] });
      setCreating(false);
      load();
    } catch (e) { onToast?.(e.message || 'Failed to create key'); }
    finally { setBusy(false); }
  };

  const rotate = async (id) => {
    try {
      setBusy(true);
      const data = await rotateApiKey(id);
      setNewKey(data); onToast?.('Key rotated — copy the new key');
      load();
    } catch (e) { onToast?.(e.message || 'Failed to rotate key'); }
    finally { setBusy(false); }
  };
  const revoke = async (id) => {
    try { setBusy(true); await revokeApiKey(id); onToast?.('Key revoked'); load(); }
    catch (e) { onToast?.(e.message || 'Failed to revoke key'); }
    finally { setBusy(false); }
  };
  const copy = (id, val) => { navigator.clipboard?.writeText(val); setCopied(id); setTimeout(() => setCopied(null), 1400); };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-violet-400" />
        <h2 className="text-lg font-semibold text-white">API Keys</h2>
        <button onClick={() => setCreating((c) => !c)} className="ml-auto flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white"><Plus className="h-3.5 w-3.5" />Create key</button>
      </div>
      <p className="text-xs text-zinc-500">Secrets are hashed at rest and never fully exposed after creation. Store keys server-side only.</p>

      {newKey && (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
          <p className="text-sm font-medium text-emerald-200">Your new API key</p>
          <p className="mt-1 text-[11px] text-emerald-300/80">Copy it now — it won't be shown again.</p>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-black/40 px-3 py-2">
            <code className="flex-1 truncate font-mono text-[11px] text-emerald-100">{newKey.key}</code>
            <button onClick={() => copy('new', newKey.key)} className="text-emerald-300 hover:text-white">{copied === 'new' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</button>
          </div>
          <button onClick={() => setNewKey(null)} className="mt-2 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5">Dismiss</button>
        </div>
      )}

      {creating && (
        <div className="space-y-3 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
          <p className="text-sm font-medium text-white">Create a new API key</p>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Key name (e.g. Production Server)" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-200 outline-none" />
          <div className="flex gap-2">
            {['live', 'test'].map((env) => (
              <button key={env} onClick={() => setForm({ ...form, environment: env })} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${form.environment === env ? 'bg-violet-600 text-white' : 'border border-white/10 text-zinc-300'}`}>{env}</button>
            ))}
          </div>
          <div>
            <p className="mb-1 text-[11px] text-zinc-400">Scopes</p>
            <div className="flex flex-wrap gap-1.5">
              {['agents:read','agents:write','agents:run','tasks:read','tasks:write','workflows:read','workflows:run','webhooks:manage','keys:manage'].map((s) => (
                <button key={s} onClick={() => toggleScope(s)} className={`rounded-full px-2 py-1 text-[10px] font-mono ${form.scopes.includes(s) ? 'bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/30' : 'border border-white/10 text-zinc-400'}`}>{s}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={create} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">{busy && <Loader2 className="h-3 w-3 animate-spin" />}Create</button>
            <button onClick={() => setCreating(false)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.03] p-4 text-xs text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" />Loading keys…</div>
      ) : keys.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-zinc-500">No API keys yet. Create one to start integrating.</div>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => (
            <div key={k.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">{k.name}</span>
                <span className={`rounded-full px-2 py-px text-[10px] font-medium ${ENV_STYLE[k.environment]}`}>{k.environment}</span>
                <span className={`rounded-full px-2 py-px text-[10px] font-medium ${KEY_STATUS_STYLE[k.status]}`}>{k.status}</span>
                <span className="ml-auto font-mono text-[10px] text-zinc-500">{k.requests_count} requests</span>
              </div>
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2">
                <code className="flex-1 truncate font-mono text-[11px] text-zinc-300">{k.masked}</code>
                <button onClick={() => copy(k.id, k.prefix)} className="text-zinc-500 hover:text-white">{copied === k.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {(k.scopes || []).map((s) => <span key={s} className="rounded-full bg-white/5 px-2 py-px text-[9px] font-mono text-zinc-400">{s}</span>)}
              </div>
              <div className="mt-2 flex items-center gap-4 text-[10px] text-zinc-500">
                <span>Created {new Date(k.created_date).toLocaleDateString()}</span>
                <span>Last used {k.last_used_date ? new Date(k.last_used_date).toLocaleString() : 'never'}</span>
                <div className="ml-auto flex gap-1.5">
                  <button onClick={() => rotate(k.id)} disabled={k.status === 'revoked' || busy} className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-300 hover:bg-white/5 disabled:opacity-40"><RotateCw className="h-3 w-3" />Rotate</button>
                  <button onClick={() => revoke(k.id)} disabled={k.status === 'revoked' || busy} className="flex items-center gap-1 rounded-lg border border-rose-400/20 px-2 py-1 text-[10px] text-rose-300 hover:bg-rose-500/15 disabled:opacity-40"><X className="h-3 w-3" />Revoke</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}