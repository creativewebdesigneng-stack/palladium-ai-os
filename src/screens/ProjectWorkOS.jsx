import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { CalendarRange, FolderKanban, Layers3, Loader2, Plus, RefreshCw, Target } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { useWorkspace } from '@/hooks/use-workspace';
import { friendlyMessage } from '@/lib/errors';
import { listProjects } from '@/lib/projects/project.functions';
import { createProjectCycle, createProjectModule, createProjectWorkItem, listProjectWorkOS, updateProjectWorkItem } from '@/lib/projects/work-os.functions';

const COLUMNS = [
  ['backlog', 'Backlog'],
  ['todo', 'To do'],
  ['in_progress', 'In progress'],
  ['in_review', 'Review'],
  ['done', 'Done'],
];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

export default function ProjectWorkOS() {
  const { session } = useWorkspace();
  const qc = useQueryClient();
  const listProjectsFn = useServerFn(listProjects);
  const workOSFn = useServerFn(listProjectWorkOS);
  const createItemFn = useServerFn(createProjectWorkItem);
  const updateItemFn = useServerFn(updateProjectWorkItem);
  const createCycleFn = useServerFn(createProjectCycle);
  const createModuleFn = useServerFn(createProjectModule);
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('normal');
  const [cycleName, setCycleName] = useState('');
  const [moduleName, setModuleName] = useState('');

  const projectsQ = useQuery({
    queryKey: ['projects', 'work-os'],
    queryFn: () => listProjectsFn({ data: { includeArchived: false } }),
    enabled: session === 'yes',
    retry: false,
  });
  const projects = projectsQ.data?.projects ?? [];
  useEffect(() => {
    if (!projectId && projects.length) setProjectId(projects[0].id);
  }, [projectId, projects]);

  const osQ = useQuery({
    queryKey: ['project-work-os', projectId],
    queryFn: () => workOSFn({ data: { projectId } }),
    enabled: session === 'yes' && Boolean(projectId),
    retry: false,
  });
  const items = osQ.data?.items ?? [];
  const cycles = osQ.data?.cycles ?? [];
  const modules = osQ.data?.modules ?? [];
  const selectedProject = projects.find((project) => project.id === projectId);
  const byStatus = useMemo(() => Object.fromEntries(COLUMNS.map(([status]) => [status, items.filter((item) => item.status === status)])), [items]);

  const refresh = async () => qc.invalidateQueries({ queryKey: ['project-work-os', projectId] });
  const createItem = useMutation({
    mutationFn: () => createItemFn({ data: { projectId, title: title.trim(), priority } }),
    onSuccess: async () => { setTitle(''); await refresh(); },
  });
  const moveItem = useMutation({
    mutationFn: ({ id, status }) => updateItemFn({ data: { id, projectId, status } }),
    onSuccess: refresh,
  });
  const createCycle = useMutation({
    mutationFn: () => createCycleFn({ data: { projectId, name: cycleName.trim() } }),
    onSuccess: async () => { setCycleName(''); await refresh(); },
  });
  const createModule = useMutation({
    mutationFn: () => createModuleFn({ data: { projectId, name: moduleName.trim() } }),
    onSuccess: async () => { setModuleName(''); await refresh(); },
  });
  const error = projectsQ.error || osQ.error || createItem.error || moveItem.error || createCycle.error || createModule.error;

  return (
    <>
      <PageHeader eyebrow="Projects" title="Work OS" description="A native delivery workspace for projects, cycles, modules and hierarchical work items—bringing Plane/OpenProject-style planning into PalladiumAI without a second project system." action={<span className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/20 bg-violet-400/10 px-3 py-2 text-[11px] text-violet-200"><FolderKanban className="h-3.5 w-3.5" />Project-native planning</span>} />

      <section className="mb-5 rounded-2xl border border-white/10 bg-white/[.03] p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-64 flex-1"><span className="mb-1.5 block text-[10px] uppercase tracking-wide text-zinc-500">Project</span><select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input"><option value="">Select a project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
          <button type="button" onClick={() => osQ.refetch()} disabled={!projectId || osQ.isFetching} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 px-3 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-40"><RefreshCw className={`h-3.5 w-3.5 ${osQ.isFetching ? 'animate-spin' : ''}`} />Refresh</button>
        </div>
      </section>

      {error && <div className="mb-5 rounded-xl border border-rose-400/20 bg-rose-400/[.05] p-3 text-xs text-rose-200">{friendlyMessage(error)}</div>}
      {projectsQ.isLoading || (projectId && osQ.isLoading) ? <Loading /> : !projects.length ? <Empty text="Create a project first. Work OS deliberately uses your existing PalladiumAI projects rather than creating a duplicate workspace." /> : projectId ? <>
        <div className="mb-5 grid gap-3 lg:grid-cols-2">
          <PlannerCard icon={CalendarRange} title="Cycles" subtitle={`${cycles.length} cycle${cycles.length === 1 ? '' : 's'}`} value={cycleName} onChange={setCycleName} placeholder="e.g. Sprint 12" disabled={!cycleName.trim() || createCycle.isPending} onCreate={() => createCycle.mutate()} chips={cycles.map((cycle) => ({ id: cycle.id, text: `${cycle.name} · ${cycle.status}` }))} />
          <PlannerCard icon={Layers3} title="Modules" subtitle={`${modules.length} module${modules.length === 1 ? '' : 's'}`} value={moduleName} onChange={setModuleName} placeholder="e.g. Billing" disabled={!moduleName.trim() || createModule.isPending} onCreate={() => createModule.mutate()} chips={modules.map((module) => ({ id: module.id, text: `${module.name} · ${module.status}` }))} />
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-64 flex-1"><p className="mb-1.5 text-[10px] uppercase tracking-wide text-zinc-500">New work item</p><input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) createItem.mutate(); }} className="input" placeholder={`Add work to ${selectedProject?.name ?? 'project'}…`} maxLength={240} /></div>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="input w-32">{PRIORITIES.map((value) => <option key={value} value={value}>{value}</option>)}</select>
            <button type="button" disabled={!title.trim() || createItem.isPending} onClick={() => createItem.mutate()} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-xs font-medium text-white disabled:opacity-40">{createItem.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}Add item</button>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-5">
            {COLUMNS.map(([status, label], columnIndex) => <div key={status} className="min-h-64 rounded-xl border border-white/10 bg-black/20 p-3"><div className="mb-3 flex items-center justify-between"><p className="text-[11px] font-semibold text-zinc-300">{label}</p><span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] text-zinc-500">{byStatus[status]?.length ?? 0}</span></div><div className="space-y-2">{(byStatus[status] ?? []).map((item) => <article key={item.id} className="rounded-xl border border-white/10 bg-white/[.03] p-3"><div className="flex items-start gap-2"><Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" /><div className="min-w-0"><p className="text-xs font-medium text-white">{item.title}</p><p className="mt-1 text-[9px] uppercase tracking-wide text-zinc-600">{item.priority}{item.estimate != null ? ` · ${item.estimate} pts` : ''}</p></div></div><div className="mt-3 flex gap-1">{columnIndex > 0 && <MoveButton disabled={moveItem.isPending} onClick={() => moveItem.mutate({ id: item.id, status: COLUMNS[columnIndex - 1][0] })}>←</MoveButton>}{columnIndex < COLUMNS.length - 1 && <MoveButton disabled={moveItem.isPending} onClick={() => moveItem.mutate({ id: item.id, status: COLUMNS[columnIndex + 1][0] })}>→</MoveButton>}</div></article>)}</div></div>)}
          </div>
        </section>
      </> : <Empty text="Choose a project to open its Work OS." />}
      <style>{`.input{height:2.25rem;border-radius:.75rem;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.3);padding:0 .75rem;font-size:.75rem;color:white;outline:none}.input:focus{border-color:rgba(139,92,246,.45)}.input::placeholder{color:rgb(82 82 91)}`}</style>
    </>
  );
}

function PlannerCard({ icon: Icon, title, subtitle, value, onChange, placeholder, disabled, onCreate, chips }) { return <section className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-violet-300" /><div><h2 className="text-xs font-semibold text-white">{title}</h2><p className="text-[10px] text-zinc-600">{subtitle}</p></div></div><div className="mt-3 flex gap-2"><input value={value} onChange={(e) => onChange(e.target.value)} className="input flex-1" placeholder={placeholder} /><button type="button" disabled={disabled} onClick={onCreate} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-zinc-300 hover:bg-white/5 disabled:opacity-30"><Plus className="h-3.5 w-3.5" /></button></div><div className="mt-3 flex flex-wrap gap-1.5">{chips.length ? chips.slice(0, 12).map((chip) => <span key={chip.id} className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[9px] text-zinc-400">{chip.text}</span>) : <span className="text-[10px] text-zinc-600">None yet</span>}</div></section>; }
function MoveButton({ children, ...props }) { return <button type="button" {...props} className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-400 hover:bg-white/5 disabled:opacity-30">{children}</button>; }
function Loading() { return <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.03] p-6 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" />Loading Work OS…</div>; }
function Empty({ text }) { return <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-10 text-center text-sm text-zinc-500">{text}</div>; }
