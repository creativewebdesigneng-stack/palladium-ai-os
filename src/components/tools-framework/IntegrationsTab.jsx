import { useState } from 'react';
import { X, Plug, Check, Loader2, Link2, Unlink } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { INTEGRATIONS, PLAN_BADGE } from './toolsData';

export default function IntegrationsTab({ connections, loading, isAdmin, onConnect, onDisconnect }) {
  const statusOf = (key) => connections.find((c) => c.provider === key);
  return (
    <>
      <PageHeader eyebrow="Framework" title="Integrations" description="Connect the external systems your agents and tools reach into."
        action={<span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">{connections.length} connected</span>} />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-zinc-500"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INTEGRATIONS.map((i) => {
            const conn = statusOf(i.key);
            const connected = conn && conn.status === 'connected';
            const plan = PLAN_BADGE[i.required_plan] || PLAN_BADGE.free;
            return <IntegrationCard key={i.key} def={i} connected={connected} conn={conn} isAdmin={isAdmin} plan={plan} onConnect={() => onConnect(i)} onDisconnect={() => onDisconnect(i)} />;
          })}
        </div>
      )}
    </>
  );
}

function IntegrationCard({ def, connected, conn, isAdmin, plan, onConnect, onDisconnect }) {
  const [busy, setBusy] = useState(false);
  const act = async (fn) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };
  return (
    <div className="pglass pcard rounded-2xl p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${def.grad} text-white text-[11px] font-bold`}>{def.initials}</div>
          <div>
            <p className="text-sm font-semibold text-white">{def.name}</p>
            <p className="text-[11px] text-zinc-500">{def.category}</p>
          </div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${plan.cls}`}>{plan.label}</span>
      </div>
      <p className="mt-2.5 text-xs text-zinc-400">{def.description}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {def.scopes.map((s) => <span key={s} className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">{s}</span>)}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className={`inline-flex items-center gap-1.5 text-[11px] ${connected ? 'text-emerald-400' : 'text-zinc-500'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-zinc-500'}`} />{connected ? 'Connected' : 'Not connected'}
        </span>
        {isAdmin ? (
          connected ? (
            <button onClick={() => act(onDisconnect)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-300 hover:bg-rose-500/20 disabled:opacity-50">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}Disconnect
            </button>
          ) : (
            <button onClick={() => act(onConnect)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500 px-2.5 py-1 text-[11px] text-white hover:bg-violet-600 disabled:opacity-50">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}Connect
            </button>
          )
        ) : <Plug className="h-3.5 w-3.5 text-zinc-600" />}
      </div>
    </div>
  );
}