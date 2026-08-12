import { useEffect, useState } from 'react';
import { Webhook, Plus, X, Copy, Loader2, Send, RotateCw, ShieldOff } from 'lucide-react';
import { listWebhooks, createWebhook, updateWebhook, deleteWebhook, testWebhook, rotateWebhookSecret, revokeWebhookSecret } from './api';
import { WEBHOOK_EVENTS } from './devPortalData';

export default function WebhooksPanel({ onToast }) {
  const [hooks, setHooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ url: '', events: ['agent.completed'], description: '' });
  const [newSecret, setNewSecret] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try { setLoading(true); const data = await listWebhooks(); setHooks(data.webhooks || []); }
    catch (e) { onToast?.(e.message || 'Failed to load webhooks'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const toggleEvent = (ev) => setForm((f) => ({ ...f, events: f.events.includes(ev) ? f.events.filter((x) => x !== ev) : [...f.events, ev] }));

  const create = async () => {
    if (!form.url.trim() || !/^https?:\/\//.test(form.url)) { onToast?.('Enter a valid URL'); return; }
    if (!form.events.length) { onToast?.('Select at least one event'); return; }
    try {
      setBusy(true);
      const data = await createWebhook(form.url.trim(), form.events, form.description);
      setNewSecret(data);
      onToast?.('Webhook created');
      setForm({ url: '', events: ['agent.completed'], description: '' });
      setCreating(false);
      load();
    } catch (e) { onToast?.(e.message || 'Failed to create webhook'); }
    finally { setBusy(false); }
  };

  const toggle = async (h) => {
    try { await updateWebhook(h.id, { status: h.status === 'active' ? 'paused' : 'active' }); load(); }
    catch (e) { onToast?.(e.message); }
  };
  const remove = async (id) => { try { await deleteWebhook(id); onToast?.('Webhook deleted'); load(); } catch (e) { onToast?.(e.message); } };
  const rotateSecret = async (id) => {
    try { setBusy(true); const d = await rotateWebhookSecret(id); setNewSecret(d); onToast?.('Secret rotated — copy the new value'); load(); }
    catch (e) { onToast?.(e.message); }
    finally { setBusy(false); }
  };
  const revokeSecret = async (id) => {
    try { setBusy(true); await revokeWebhookSecret(id); onToast?.('Secret revoked — deliveries paused'); load(); }
    catch (e) { onToast?.(e.message); }
    finally { setBusy(false); }
  };
  const test = async (id) => { try { const d = await testWebhook(id); onToast?.(`Test sent — status ${d.last_response_status || 'n/a'}`); load(); } catch (e) { onToast?.(e.message); } };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Webhook className="h-5 w-5 text-violet-400" />
        <h2 className="text-lg font-semibold text-white">Webhooks</h2>
        <button onClick={() => setCreating((c) => !c)} className="ml-auto flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white"><Plus className="h-3.5 w-3.5" />Create webhook</button>
      </div>
      <p className="text-xs text-zinc-500">Receive real-time events for agent runs, tasks, workflows, approvals and purchases. Every delivery is HMAC-SHA256 signed; revoking a secret pauses the endpoint because unsigned payloads are never sent.</p>

      {newSecret && (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
          <p className="text-sm font-medium text-emerald-200">Signing secret</p>
          <p className="mt-1 text-[11px] text-emerald-300/80">Store it server-side — it won't be shown again.</p>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-black/40 px-3 py-2">
            <code className="flex-1 truncate font-mono text-[11px] text-emerald-100">{newSecret.secret}</code>
            <button onClick={() => navigator.clipboard?.writeText(newSecret.secret)} className="text-emerald-300 hover:text-white"><Copy className="h-3.5 w-3.5" /></button>
          </div>
          <button onClick={() => setNewSecret(null)} className="mt-2 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5">Dismiss</button>
        </div>
      )}

      {creating && (
        <div className="space-y-3 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
          <div>
            <label className="text-[11px] text-zinc-400">URL</label>
            <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://app.example.com/hooks" className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-200 outline-none" />
          </div>
          <div>
            <label className="text-[11px] text-zinc-400">Events</label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {WEBHOOK_EVENTS.map((ev) => (
                <button key={ev} onClick={() => toggleEvent(ev)} className={`rounded-full px-2 py-1 text-[10px] font-mono ${form.events.includes(ev) ? 'bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/30' : 'border border-white/10 text-zinc-400'}`}>{ev}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] text-zinc-400">Description (optional)</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-200 outline-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={create} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">{busy && <Loader2 className="h-3 w-3 animate-spin" />}Create</button>
            <button onClick={() => setCreating(false)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.03] p-4 text-xs text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" />Loading webhooks…</div>
      ) : hooks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-zinc-500">No webhooks yet. Create one to receive real-time events.</div>
      ) : (
        <div className="space-y-2">
          {hooks.map((h) => (
            <div key={h.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
              <div className="flex items-center gap-2">
                <span className="truncate text-[12px] font-medium text-white">{h.url}</span>
                <span className={`rounded-full px-2 py-px text-[10px] font-medium ${h.status === 'active' ? 'text-emerald-400 bg-emerald-400/10' : 'text-zinc-500 bg-white/5'}`}>{h.status}</span>
                <button onClick={() => remove(h.id)} className="ml-auto text-zinc-500 hover:text-rose-300"><X className="h-4 w-4" /></button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {(h.events || []).map((ev) => <span key={ev} className="rounded-full bg-white/5 px-2 py-px text-[9px] font-mono text-zinc-400">{ev}</span>)}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                <div><p className="text-zinc-500">Secret</p><p className="font-mono text-zinc-300">{h.secret || 'revoked'}</p></div>
                <div><p className="text-zinc-500">Deliveries</p><p className="font-mono text-zinc-300">{h.deliveries_count || 0}</p></div>
                <div><p className="text-zinc-500">Last status</p><p className="font-mono text-zinc-300">{h.last_response_status || '—'}</p></div>
              </div>
              <div className="mt-2 flex gap-1.5">
                <button onClick={() => toggle(h)} className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-300 hover:bg-white/5">{h.status === 'active' ? 'Pause' : 'Resume'}</button>
                <button onClick={() => test(h.id)} className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-300 hover:bg-white/5"><Send className="h-3 w-3" />Send test</button>
                <button onClick={() => rotateSecret(h.id)} disabled={busy} className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-300 hover:bg-white/5 disabled:opacity-40"><RotateCw className="h-3 w-3" />Rotate secret</button>
                <button onClick={() => revokeSecret(h.id)} disabled={busy || !h.secret_set} className="flex items-center gap-1 rounded-lg border border-rose-400/20 px-2 py-1 text-[10px] text-rose-300 hover:bg-rose-500/15 disabled:opacity-40"><ShieldOff className="h-3 w-3" />Revoke secret</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}