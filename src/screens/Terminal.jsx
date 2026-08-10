import { useState } from 'react';
import { Cpu, MemoryStick, Activity, Network, Plus } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import TerminalView from '@/components/terminal/TerminalView';
import LogsView from '@/components/terminal/LogsView';
import ProcessesView from '@/components/terminal/ProcessesView';
import EnvironmentView from '@/components/terminal/EnvironmentView';
import PortsView from '@/components/terminal/PortsView';
import { METRICS } from '@/components/terminal/terminalData';

const TABS = ['Terminal', 'Logs', 'Processes', 'Environment', 'Ports'];

function MetricCard({ icon: I, label, value, sub, tone }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] px-4 py-3">
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><I className="h-5 w-5 text-white" /></span>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
        <p className="text-lg font-semibold text-white">{value}</p>
        {sub && <p className="text-[10px] text-zinc-500">{sub}</p>}
      </div>
    </div>
  );
}

export default function Terminal() {
  const [tab, setTab] = useState('Terminal');
  const [sessions, setSessions] = useState([1]);
  const [toast, setToast] = useState(null);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 1600); };

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Terminal"
        description="Sandboxed terminal & system monitor. No host machine access — backend execution ready."
        action={
          tab === 'Terminal' && (
            <button onClick={() => setSessions((s) => [...s, (s[s.length - 1] || 0) + 1])} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white">
              <Plus className="h-3.5 w-3.5" />New Terminal
            </button>
          )
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Cpu} label="CPU" value={`${METRICS.cpu.value}%`} sub={`${METRICS.cpu.cores} cores · load ${METRICS.cpu.load}`} tone="bg-gradient-to-br from-sky-600/40 to-blue-600/40" />
        <MetricCard icon={MemoryStick} label="Memory" value={`${METRICS.mem.used} MB`} sub={`${METRICS.mem.pct}% of ${METRICS.mem.total} MB`} tone="bg-gradient-to-br from-violet-600/40 to-indigo-600/40" />
        <MetricCard icon={Activity} label="Processes" value={METRICS.procs} sub="1 running" tone="bg-gradient-to-br from-emerald-600/40 to-teal-600/40" />
        <MetricCard icon={Network} label="Ports" value={METRICS.ports} sub="3 listening" tone="bg-gradient-to-br from-amber-600/40 to-orange-600/40" />
      </div>

      <div className="mb-3 flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[.03] p-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition ${tab === t ? 'bg-violet-500/20 text-white ring-1 ring-violet-400/20' : 'text-zinc-400 hover:text-white'}`}>{t}</button>
        ))}
      </div>

      <div className="h-[460px] space-y-3">
        {tab === 'Terminal' && sessions.map((id) => <div key={id} className="h-[440px]"><TerminalView id={id} onToast={flash} /></div>)}
        {tab === 'Logs' && <div className="h-full"><LogsView onToast={flash} /></div>}
        {tab === 'Processes' && <div className="h-full"><ProcessesView onToast={flash} /></div>}
        {tab === 'Environment' && <div className="h-full"><EnvironmentView /></div>}
        {tab === 'Ports' && <div className="h-full"><PortsView /></div>}
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#10121a] px-4 py-2 text-xs text-zinc-200 shadow-2xl">{toast}</div>}
    </>
  );
}