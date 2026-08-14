import { useQuery } from '@tanstack/react-query';
import { Activity, Globe, ShieldCheck, Loader2, Terminal, Wallet, KeyRound } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import BrowserProviderBadge, { BrowserProviderNotice } from '@/components/browser/BrowserProviderBadge';
import { getBrowserControl } from '@/lib/browser/browser.functions';
import { friendlyMessage } from '@/lib/errors';

/**
 * Browser & computer control console.
 *
 * Shows only what actually happened: the real provider state and the recorded
 * browser sessions and tool runs. No simulated pages, tabs or agent actions are
 * rendered, and simulated steps are always labelled as such.
 */
export default function ComputerControl() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['browser-control'],
    queryFn: () => getBrowserControl({ data: {} }),
    staleTime: 15_000,
  });

  const browser = data?.browser;
  const counts = data?.counts;

  const metrics = [
    { label: 'Recorded sessions', value: counts?.sessions ?? 0, icon: Globe, grad: 'from-sky-500 to-cyan-500' },
    { label: 'Running now', value: counts?.active ?? 0, icon: Activity, grad: 'from-violet-500 to-indigo-500' },
    { label: 'Recorded steps', value: counts?.steps ?? 0, icon: Terminal, grad: 'from-emerald-500 to-teal-500' },
    { label: 'Allow-listed domains', value: counts?.domains ?? 0, icon: ShieldCheck, grad: 'from-amber-500 to-orange-500' },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Runtime"
        title="Browser & computer control"
        description="Everything agents did in a browser, exactly as it was recorded. Agents can never pay for anything."
        action={<BrowserProviderBadge browser={browser} />}
      />

      <BrowserProviderNotice browser={browser} />

      {error && (
        <div className="mb-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-xs text-rose-200">
          {friendlyMessage(error)}
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((m) => {
          const I = m.icon;
          return (
            <div key={m.label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${m.grad} text-white`}>
                <I className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xl font-semibold text-white">{isLoading ? '—' : m.value}</p>
                <p className="text-[10px] text-zinc-500">{m.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Panel title="Browser sessions" icon={Globe} tint="text-cyan-400">
            {isLoading ? (
              <Center />
            ) : (data?.sessions ?? []).length === 0 ? (
              <Empty text="No browser sessions have run yet." />
            ) : (
              <div className="space-y-2">
                {data.sessions.map((s) => (
                  <SessionRow key={s.id} session={s} />
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Browser tool runs" icon={Terminal} tint="text-violet-400">
            {isLoading ? (
              <Center />
            ) : (data?.executions ?? []).length === 0 ? (
              <Empty text="No browser or shopping tool runs recorded yet." />
            ) : (
              <div className="space-y-1.5">
                {data.executions.map((e) => (
                  <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px]">
                    <span className="font-medium text-white">{e.tool}</span>
                    <span className="text-zinc-500">{new Date(e.created_at).toLocaleString()}</span>
                    <span className={`rounded-full px-2 py-0.5 ${e.status === 'succeeded' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                      {e.status}
                    </span>
                    {e.error && <span className="w-full text-rose-400">{e.error}</span>}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <Panel title="Enforced safeguards" icon={ShieldCheck} tint="text-emerald-400">
          <ul className="space-y-2 text-[11px] text-zinc-300">
            {[
              { icon: ShieldCheck, text: 'Agents may only reach domains on your allow-list. Everything else is blocked server-side.' },
              { icon: Wallet, text: 'Purchases can only be prepared. Payment requires your explicit approval in the Approval centre.' },
              { icon: KeyRound, text: 'Agents never receive card numbers or payment credentials of any kind.' },
              { icon: Activity, text: 'Every browser step and tool run is recorded and auditable.' },
            ].map((s) => {
              const I = s.icon;
              return (
                <li key={s.text} className="flex gap-2.5 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <I className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span>{s.text}</span>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </>
  );
}

function SessionRow({ session }) {
  const steps = Array.isArray(session.steps) ? session.steps : [];
  const simulated = steps.some((s) => s?.simulated) || session.provider === 'development_simulation';
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="font-semibold text-white">{session.provider}</span>
        {simulated && (
          <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-0.5 text-amber-300">simulated — no real browsing</span>
        )}
        <span className="text-zinc-500">{session.status}</span>
        <span className="ml-auto text-zinc-600">{new Date(session.created_at).toLocaleString()}</span>
      </div>
      <p className="mt-1 text-[10px] text-zinc-500">
        Allow-list: {(session.allowed_domains ?? []).join(', ') || 'none'}
      </p>
      {steps.length > 0 && (
        <div className="mt-2 space-y-1">
          {steps.slice(0, 8).map((s, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/5 bg-white/[.02] px-2.5 py-1.5 text-[10px]">
              <span className="font-medium text-zinc-200">{s.kind}</span>
              <span className="truncate text-zinc-500">{s.target}</span>
              {s.detail && <span className="text-zinc-600">{s.detail}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Panel({ title, icon: Icon, tint, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${tint}`} />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Center() {
  return (
    <div className="flex justify-center py-10 text-zinc-500">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}

function Empty({ text }) {
  return <p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-zinc-500">{text}</p>;
}
