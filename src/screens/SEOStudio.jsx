import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, ExternalLink, Link2, Plus, Search, ShieldCheck } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { listSeoProjects, listSeoSnapshots, saveSeoProject, saveSeoSnapshot } from '@/lib/seo/seo.functions';
import { useToast } from '@/components/ui/use-toast';

const KINDS = [
  ['keyword', Search],
  ['rank', BarChart3],
  ['backlink', Link2],
  ['audit', ShieldCheck],
];

export default function SEOStudio() {
  const { toast } = useToast();
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState('');
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectForm, setProjectForm] = useState({ name: '', domain: '' });
  const [snapshotForm, setSnapshotForm] = useState({ kind: 'keyword', subject: '', notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const projectResult = await listSeoProjects({ data: undefined });
      const next = projectResult.projects || [];
      setProjects(next);
      const projectId = selected || next[0]?.id || '';
      if (!selected && projectId) setSelected(projectId);
      const snapshotResult = await listSeoSnapshots({ data: { projectId: projectId || null, limit: 300 } });
      setSnapshots(snapshotResult.snapshots || []);
    } catch (error) {
      toast({ title: 'Could not load SEO Studio', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [selected, toast]);

  useEffect(() => { void load(); }, [load]);

  const activeProject = projects.find((project) => project.id === selected) || null;
  const counts = useMemo(() => Object.fromEntries(KINDS.map(([kind]) => [kind, snapshots.filter((item) => item.kind === kind).length])), [snapshots]);

  async function createProject(event) {
    event.preventDefault();
    try {
      const result = await saveSeoProject({ data: { name: projectForm.name, domain: projectForm.domain, provider: 'provider-neutral' } });
      setProjectForm({ name: '', domain: '' });
      setSelected(result.project.id);
      toast({ title: 'SEO project created', description: result.project.domain });
    } catch (error) {
      toast({ title: 'Could not create SEO project', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    }
  }

  async function addSnapshot(event) {
    event.preventDefault();
    if (!selected) return;
    try {
      await saveSeoSnapshot({ data: { projectId: selected, kind: snapshotForm.kind, subject: snapshotForm.subject, metrics: {}, notes: snapshotForm.notes, source: 'manual' } });
      setSnapshotForm((current) => ({ ...current, subject: '', notes: '' }));
      await load();
      toast({ title: 'SEO observation recorded' });
    } catch (error) {
      toast({ title: 'Could not record SEO observation', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    }
  }

  return <>
    <PageHeader eyebrow="Business growth" title="SEO Studio" description="Track keyword research, rankings, backlinks and technical site-audit findings in one provider-neutral workspace that AI agents can use through PalladiumAI's existing Tools Framework." />

    <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
      <aside className="space-y-4 rounded-2xl border border-white/10 bg-white/[.025] p-4">
        <div>
          <p className="text-sm font-medium text-white">Sites</p>
          <p className="mt-1 text-xs text-zinc-500">External SEO providers stay in Integrations; this page stores the durable SEO work product.</p>
        </div>
        <form onSubmit={createProject} className="space-y-2">
          <input required value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} placeholder="Project name" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none" />
          <input required value={projectForm.domain} onChange={(e) => setProjectForm({ ...projectForm, domain: e.target.value })} placeholder="example.com" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none" />
          <button className="flex w-full items-center justify-center gap-1 rounded-xl bg-violet-600 px-3 py-2 text-xs font-medium text-white"><Plus className="h-3.5 w-3.5" />Add site</button>
        </form>
        <div className="space-y-2">
          {projects.map((project) => <button key={project.id} onClick={() => setSelected(project.id)} className={`w-full rounded-xl border p-3 text-left ${selected === project.id ? 'border-violet-400/30 bg-violet-500/[.08]' : 'border-white/10 bg-black/15'}`}>
            <p className="truncate text-sm text-white">{project.name}</p><p className="mt-1 truncate text-xs text-zinc-500">{project.domain}</p>
          </button>)}
          {!loading && !projects.length && <p className="py-6 text-center text-xs text-zinc-600">Add a website to begin.</p>}
        </div>
      </aside>

      <section className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {KINDS.map(([kind, Icon]) => <div key={kind} className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><Icon className="h-4 w-4 text-violet-300" /><p className="mt-2 text-xl font-semibold text-white">{counts[kind] || 0}</p><p className="text-xs capitalize text-zinc-500">{kind} records</p></div>)}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-base font-medium text-white">{activeProject?.name || 'SEO observations'}</p><p className="mt-1 text-xs text-zinc-500">{activeProject?.domain || 'Choose or create a site.'}</p></div>
            {activeProject && <a href={`https://${activeProject.domain}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white">Open site <ExternalLink className="h-3.5 w-3.5" /></a>}
          </div>

          {activeProject && <form onSubmit={addSnapshot} className="mt-4 grid gap-2 md:grid-cols-[140px_1fr_auto]">
            <select value={snapshotForm.kind} onChange={(e) => setSnapshotForm({ ...snapshotForm, kind: e.target.value })} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white">
              {KINDS.map(([kind]) => <option key={kind} value={kind}>{kind}</option>)}
            </select>
            <input required value={snapshotForm.subject} onChange={(e) => setSnapshotForm({ ...snapshotForm, subject: e.target.value })} placeholder="Keyword, ranking, backlink URL or audit finding" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none" />
            <button className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black">Record</button>
          </form>}

          <div className="mt-4 space-y-2">
            {snapshots.map((item) => <div key={item.id} className="flex gap-3 rounded-xl border border-white/10 bg-black/15 p-3"><Activity className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm text-white">{item.subject}</p><span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase text-zinc-500">{item.kind}</span></div><p className="mt-1 text-xs text-zinc-500">{item.notes || `Source: ${item.source}`}</p></div></div>)}
            {!loading && activeProject && !snapshots.length && <p className="py-10 text-center text-xs text-zinc-600">No SEO observations yet. Agents and approved integrations can also populate this workspace.</p>}
          </div>
        </div>
      </section>
    </div>
  </>;
}
