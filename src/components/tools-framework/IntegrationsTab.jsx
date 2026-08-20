import { useState } from 'react';
import { ExternalLink, Loader2, Link2, Plug, Unlink } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';

const GRADIENTS = [
  'from-violet-500 to-indigo-500',
  'from-cyan-500 to-sky-500',
  'from-emerald-500 to-teal-500',
  'from-fuchsia-500 to-pink-500',
  'from-amber-500 to-orange-500',
];

function initials(name) {
  return String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export default function IntegrationsTab({ catalogue, loading, isAdmin, onConnect, onDisconnect }) {
  const connectedCount = catalogue.filter((item) => item.connection?.status === 'connected').length;
  return (
    <>
      <PageHeader
        eyebrow="Framework"
        title="Integrations"
        description="Canonical server-side provider catalogue and your live OAuth connection state."
        action={<span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">{connectedCount} connected · {catalogue.length} available</span>}
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-zinc-500"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : catalogue.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-zinc-500">No integration providers are registered.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {catalogue.map((item, index) => (
            <IntegrationCard
              key={item.id}
              def={item}
              gradient={GRADIENTS[index % GRADIENTS.length]}
              isAdmin={isAdmin}
              onConnect={() => onConnect(item)}
              onDisconnect={() => onDisconnect(item)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function IntegrationCard({ def, gradient, isAdmin, onConnect, onDisconnect }) {
  const [busy, setBusy] = useState(false);
  const connected = def.connection?.status === 'connected';
  const health = def.connection?.health;
  const act = async (fn) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };

  return (
    <div className="pglass pcard rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${gradient} text-[11px] font-bold text-white`}>{initials(def.name)}</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{def.name}</p>
            <p className="text-[11px] text-zinc-500">{def.category || 'Integration'}</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${def.configured ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300' : 'border-amber-400/20 bg-amber-500/10 text-amber-300'}`}>
          {def.configured ? 'Configured' : 'Needs credentials'}
        </span>
      </div>

      <p className="mt-2.5 min-h-10 text-xs leading-5 text-zinc-400">{def.summary || 'OAuth integration provider.'}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {(def.scopes || []).slice(0, 5).map((scope) => <span key={scope} className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">{scope}</span>)}
      </div>

      {health?.summary && <p className={`mt-2 text-[10px] ${health.ok === false ? 'text-amber-300' : 'text-zinc-500'}`}>{health.summary}</p>}
      {def.connection?.account_label && <p className="mt-1 truncate text-[10px] text-zinc-600">Account: {def.connection.account_label}</p>}

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 text-[11px] ${connected ? 'text-emerald-400' : 'text-zinc-500'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-zinc-500'}`} />{connected ? 'Connected' : 'Not connected'}
        </span>
        <div className="flex items-center gap-1.5">
          {def.docsUrl && (
            <a href={def.docsUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 p-1.5 text-zinc-500 hover:bg-white/5 hover:text-zinc-300" aria-label={`${def.name} documentation`}>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {isAdmin ? (
            connected ? (
              <button onClick={() => act(onDisconnect)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-300 hover:bg-rose-500/20 disabled:opacity-50">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}Disconnect
              </button>
            ) : (
              <button onClick={() => act(onConnect)} disabled={busy || !def.configured} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500 px-2.5 py-1 text-[11px] text-white hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-40">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}{def.configured ? 'Connect' : 'Unavailable'}
              </button>
            )
          ) : <Plug className="h-3.5 w-3.5 text-zinc-600" />}
        </div>
      </div>
    </div>
  );
}
