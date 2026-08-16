import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Camera,
  CheckCircle2,
  Code2,
  Globe2,
  Loader2,
  Network,
  ShieldAlert,
  TerminalSquare,
} from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { getBrowserControl } from '@/lib/browser/browser.functions';
import { friendlyMessage } from '@/lib/errors';

function stateClasses(state) {
  if (state === 'production_connected') return 'border-emerald-400/20 bg-emerald-500/[.07] text-emerald-200';
  if (state === 'development_simulation') return 'border-amber-400/20 bg-amber-500/[.07] text-amber-200';
  return 'border-rose-400/20 bg-rose-500/[.07] text-rose-200';
}

function stateLabel(state) {
  if (state === 'production_connected') return 'Production connected';
  if (state === 'development_simulation') return 'Development simulation';
  return 'Not configured';
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

export default function BrowserPreview() {
  const navigate = useNavigate();
  const controlFn = useServerFn(getBrowserControl);
  const control = useQuery({
    queryKey: ['browser-control'],
    queryFn: () => controlFn({ data: {} }),
    retry: false,
  });

  const data = control.data;
  const browser = data?.browser;
  const sessions = data?.sessions ?? [];
  const executions = data?.executions ?? [];
  const counts = data?.counts ?? { sessions: 0, active: 0, steps: 0, domains: 0 };

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Browser Preview"
        description="Live browser-provider health, recorded sessions and browser tool activity. No fixture sessions or fake telemetry are shown here."
      />

      {control.isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.025] p-12 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />Checking browser runtime…
        </div>
      ) : control.error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/[.07] p-5 text-sm text-rose-200">
          <div className="flex items-center gap-2 font-medium"><ShieldAlert className="h-4 w-4" />Browser control could not load</div>
          <p className="mt-1 text-xs text-rose-100/70">{friendlyMessage(control.error)}</p>
          <button onClick={() => control.refetch()} className="mt-3 rounded-lg border border-rose-300/20 px-3 py-1.5 text-xs hover:bg-rose-400/10">Try again</button>
        </div>
      ) : (
        <>
          <section className={`rounded-2xl border p-5 ${stateClasses(browser?.state)}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-70">Browser provider</p>
                <div className="mt-2 flex items-center gap-2">
                  {browser?.state === 'production_connected' ? <CheckCircle2 className="h-5 w-5" /> : <Globe2 className="h-5 w-5" />}
                  <h2 className="text-lg font-semibold">{browser?.label ?? 'Not configured'}</h2>
                  <span className="rounded-full border border-current/20 px-2 py-1 text-[10px] font-medium">{stateLabel(browser?.state)}</span>
                </div>
                <p className="mt-2 max-w-3xl text-xs leading-5 opacity-75">{browser?.detail ?? 'Browser provider status is unavailable.'}</p>
              </div>
              <button onClick={() => control.refetch()} className="rounded-xl border border-current/20 px-3 py-2 text-xs font-medium hover:bg-white/[.05]">Refresh status</button>
            </div>
          </section>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric label="Recorded sessions" value={counts.sessions} icon={Globe2} />
            <Metric label="Active sessions" value={counts.active} icon={Activity} />
            <Metric label="Recorded steps" value={counts.steps} icon={Network} />
            <Metric label="Allowed domains seen" value={counts.domains} icon={ShieldAlert} />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
            <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Recent browser sessions</h3>
                  <p className="mt-1 text-[11px] text-zinc-500">Real persisted session records for your account.</p>
                </div>
              </div>
              {sessions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-zinc-500">No browser sessions have been recorded yet.</div>
              ) : (
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <div key={session.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-white">{session.provider || 'browser provider'}</span>
                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-400">{session.status}</span>
                        <span className="ml-auto text-[10px] text-zinc-600">{formatDate(session.created_at)}</span>
                      </div>
                      <p className="mt-2 text-[11px] text-zinc-500">{Array.isArray(session.allowed_domains) && session.allowed_domains.length ? session.allowed_domains.join(', ') : 'No domains recorded'}</p>
                      <p className="mt-1 text-[10px] text-zinc-600">{Array.isArray(session.steps) ? session.steps.length : 0} recorded step(s)</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
              <h3 className="text-sm font-semibold text-white">Recent browser tool executions</h3>
              <p className="mt-1 text-[11px] text-zinc-500">Browser, shopping search and purchase-preparation executions only.</p>
              <div className="mt-4 space-y-2">
                {executions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-zinc-500">No browser tool executions yet.</div>
                ) : executions.map((execution) => (
                  <div key={execution.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white">{execution.tool}</span>
                      <span className="ml-auto text-[10px] text-zinc-500">{execution.status}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-600">
                      <span>{execution.duration_ms != null ? `${execution.duration_ms} ms` : 'Duration unavailable'}</span>
                      <span>{formatDate(execution.created_at)}</span>
                    </div>
                    {execution.error && <p className="mt-2 line-clamp-2 text-[10px] text-rose-300">{execution.error}</p>}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="mt-4 rounded-2xl border border-white/10 bg-white/[.025] p-5">
            <h3 className="text-sm font-semibold text-white">Related live areas</h3>
            <p className="mt-1 text-xs text-zinc-500">These links open real persisted or connected services; unsupported actions remain explicitly disabled instead of being simulated.</p>
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              <NavButton icon={Camera} label="Files" detail="Private files and captured artifacts" onClick={() => navigate('/files')} />
              <NavButton icon={Code2} label="Code Explorer" detail="Authenticated read-only GitHub access" onClick={() => navigate('/code-explorer')} />
              <NavButton icon={TerminalSquare} label="Terminal" detail="Audited command-runner status" onClick={() => navigate('/terminal')} />
            </div>
          </section>
        </>
      )}
    </>
  );
}

function Metric({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-4">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><Icon className="h-4 w-4" /></span>
      <div><p className="text-lg font-semibold text-white">{value}</p><p className="text-[10px] text-zinc-500">{label}</p></div>
    </div>
  );
}

function NavButton({ icon: Icon, label, detail, onClick }) {
  return (
    <button onClick={onClick} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left hover:bg-white/[.04]">
      <span className="flex items-center gap-2 text-sm font-medium text-white"><Icon className="h-4 w-4 text-violet-300" />{label}</span>
      <span className="mt-1 block text-[11px] text-zinc-500">{detail}</span>
    </button>
  );
}
