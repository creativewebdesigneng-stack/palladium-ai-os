import { useState } from 'react';
import { Search } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import EnvOverview from '@/components/deployments/EnvOverview';
import DeploymentCard from '@/components/deployments/DeploymentCard';
import BuildsTable from '@/components/deployments/BuildsTable';
import DomainsPanel from '@/components/deployments/DomainsPanel';
import { PROJECTS, DEPLOYMENTS } from '@/components/deployments/deploymentsData';

export default function Deployments() {
  const [project, setProject] = useState('all');
  const [env, setEnv] = useState(null);
  const [q, setQ] = useState('');
  const [toast, setToast] = useState(null);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 1600); };

  const filtered = DEPLOYMENTS.filter((d) =>
    (project === 'all' || d.project === project) &&
    (!env || d.env === env) &&
    (!q || (d.version + d.commit + d.msg + d.author).toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <>
      <PageHeader eyebrow="Workspace" title="Deployments" description="Ship across environments, track builds, and manage domains." />

      {/* Environments */}
      <EnvOverview active={env} setActive={setEnv} />

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[.03] p-1">
          <button onClick={() => setProject('all')} className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium ${project === 'all' ? 'bg-violet-500/20 text-white' : 'text-zinc-400 hover:text-white'}`}>All projects</button>
          {PROJECTS.map((p) => (
            <button key={p.id} onClick={() => setProject(p.id)} className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium ${project === p.id ? 'bg-violet-500/20 text-white' : 'text-zinc-400 hover:text-white'}`}>{p.name}</button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search version, commit, message…" className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-xs text-zinc-200 outline-none" />
        </div>
      </div>

      {/* Deployments */}
      <div className="mt-4">
        <h2 className="mb-3 text-sm font-semibold text-white">Deployments <span className="text-zinc-500">({filtered.length})</span></h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((d) => <DeploymentCard key={d.id} d={d} onAction={(a) => flash(`${a} — ${d.version} (${d.env})`)} />)}
          {!filtered.length && <p className="text-sm text-zinc-600">No deployments match your filters.</p>}
        </div>
      </div>

      {/* Builds */}
      <div className="mt-6"><BuildsTable /></div>

      {/* Domains */}
      <div className="mt-6"><DomainsPanel onToast={flash} /></div>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#10121a] px-4 py-2 text-xs text-zinc-200 shadow-2xl">{toast}</div>}
    </>
  );
}