import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Archive, Bot, CalendarDays, CheckCircle2, CirclePause, FolderKanban, Link2, Loader2, Plus, Search, Unlink, Workflow, X } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { useWorkspace } from '@/hooks/use-workspace';
import {
  addProjectResource,
  archiveProject,
  createProject,
  listProjectResources,
  listProjects,
  removeProjectResource,
  updateProject,
} from '@/lib/projects/project.functions';
import { friendlyMessage } from '@/lib/errors';

const STATUS = {
  active: { label: 'Active', cls: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20' },
  paused: { label: 'Paused', cls: 'bg-amber-400/10 text-amber-300 border-amber-400/20' },
  completed: { label: 'Completed', cls: 'bg-sky-400/10 text-sky-300 border-sky-400/20' },
  archived: { label: 'Archived', cls: 'bg-zinc-400/10 text-zinc-300 border-zinc-400/20' },
};

const PRIORITY = {
  low: 'text-zinc-400',
  normal: 'text-violet-300',
  high: 'text-amber-300',
  urgent: 'text-rose-300',
};

export default function Projects() {
  const workspace = useWorkspace();
  const queryClient = useQueryClient();
  const listFn = useServerFn(listProjects);
  const createFn = useServerFn(createProject);
  const updateFn = useServerFn(updateProject);
  const archiveFn = useServerFn(archiveProject);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [managingResources, setManagingResources] = useState(null);

  const scope = workspace.activeOrgId ?? null;
  const projectsQuery = useQuery({
    queryKey: ['projects', scope, showArchived],
    queryFn: () => listFn({ data: { orgId: scope, includeArchived: showArchived } }),
    enabled: workspace.session === 'yes',
    retry: false,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['projects'] });
  const createMutation = useMutation({ mutationFn: (data) => createFn({ data }), onSuccess: () => { invalidate(); setCreateOpen(false); } });
  const updateMutation = useMutation({ mutationFn: (data) => updateFn({ data }), onSuccess: () => { invalidate(); setEditing(null); } });
  const archiveMutation = useMutation({ mutationFn: (id) => archiveFn({ data: { id } }), onSuccess: invalidate });

  const projects = projectsQuery.data?.projects ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q) ||
      (p.tags ?? []).some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [projects, search]);

  const counts = {
    total: projects.length,
    active: projects.filter((p) => p.status === 'active').length,
    paused: projects.filter((p) => p.status === 'paused').length,
    completed: projects.filter((p) => p.status === 'completed').length,
  };

  const scopeName = scope
    ? workspace.organisations.find((o) => o.id === scope)?.name ?? 'Organisation'
    : 'Personal workspace';

  return (
    <div className="relative isolate -mx-3 -mt-3 min-h-[calc(100vh-5rem)] overflow-hidden rounded-[28px] px-3 pb-8 pt-3 sm:-mx-5 sm:px-5">
      <div className="pointer-events-none absolute inset-0 -z-20 overflow-hidden rounded-[28px]">
        <div
          className="absolute inset-0 scale-[1.02] bg-cover bg-center opacity-70"
          style={{ backgroundImage: "url('/projects-palladium-bg.webp')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(1,5,14,.46)_0%,rgba(1,7,19,.70)_35%,rgba(1,6,16,.90)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,transparent_0%,rgba(0,5,15,.18)_38%,rgba(0,4,12,.82)_100%)]" />
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(33,157,255,.08) 1px, transparent 1px),linear-gradient(90deg,rgba(33,157,255,.06) 1px,transparent 1px)', backgroundSize: '44px 44px' }} />
      </div>

      <div className="pointer-events-none absolute left-1/2 top-[42%] -z-10 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-blue-500/[.035] blur-3xl" />

      <div className="relative z-10">
        <PageHeader
          eyebrow="Workspace"
          title="Projects"
          description={`Persistent projects for ${scopeName}. Project data, lifecycle state and linked AI resources are stored in the backend.`}
          action={(
            <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 rounded-xl border border-cyan-300/20 bg-blue-600/80 px-3.5 py-2 text-sm font-medium text-white shadow-[0_0_28px_rgba(0,140,255,.22)] backdrop-blur hover:bg-blue-500">
              <Plus className="h-4 w-4" />New project
            </button>
          )}
        />

        {(workspace.error || projectsQuery.error) && (
          <div className="mb-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-xs text-rose-200 backdrop-blur-xl">
            {friendlyMessage(workspace.error || projectsQuery.error)}
          </div>
        )}

        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Projects" value={counts.total} icon={FolderKanban} />
          <Metric label="Active" value={counts.active} icon={CheckCircle2} />
          <Metric label="Paused" value={counts.paused} icon={CirclePause} />
          <Metric label="Completed" value={counts.completed} icon={CheckCircle2} />
        </div>

        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-cyan-300/10 bg-[#04101d]/70 p-3 shadow-[0_0_35px_rgba(0,100,255,.05)] backdrop-blur-xl sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300/40" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects or tags…" className="w-full rounded-xl border border-cyan-300/10 bg-black/30 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300/35" />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Include archived
          </label>
        </div>

        {workspace.isLoading || projectsQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/10 bg-[#04101d]/70 p-12 text-sm text-zinc-500 backdrop-blur-xl"><Loader2 className="h-5 w-5 animate-spin text-cyan-300" />Loading projects…</div>
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-cyan-300/15 bg-[#03101c]/55 p-14 text-center backdrop-blur-xl">
            <FolderKanban className="h-9 w-9 text-cyan-400/35" />
            <h2 className="mt-3 text-base font-semibold text-white">{search ? 'No matching projects' : 'No projects yet'}</h2>
            <p className="mt-1 max-w-md text-xs leading-5 text-zinc-500">{search ? 'Try a different search.' : `Create the first project in ${scopeName}. It will be persisted and protected by workspace access rules.`}</p>
            {!search && <button onClick={() => setCreateOpen(true)} className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-medium text-white shadow-[0_0_24px_rgba(0,140,255,.20)]">Create project</button>}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={() => setEditing(project)}
                onResources={() => setManagingResources(project)}
                onArchive={() => archiveMutation.mutate(project.id)}
                archiving={archiveMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {createOpen && <ProjectForm title="Create project" submitLabel="Create project" scope={scope} onClose={() => setCreateOpen(false)} onSubmit={(data) => createMutation.mutate(data)} pending={createMutation.isPending} error={createMutation.error} />}
      {editing && <ProjectForm title="Edit project" submitLabel="Save changes" project={editing} onClose={() => setEditing(null)} onSubmit={(data) => updateMutation.mutate({ id: editing.id, ...data })} pending={updateMutation.isPending} error={updateMutation.error} />}
      {managingResources && <ResourceManager project={managingResources} onClose={() => setManagingResources(null)} />}
    </div>
  );
}

function Metric({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-cyan-300/10 bg-[#04101d]/68 p-4 shadow-[0_0_28px_rgba(0,111,255,.05)] backdrop-blur-xl">
      <span className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-300/10 bg-blue-500/[.08] text-cyan-300"><Icon className="h-4 w-4" /></span>
      <div><p className="text-xl font-semibold text-white">{value}</p><p className="text-[10px] text-cyan-100/45">{label}</p></div>
    </div>
  );
}

function ProjectCard({ project, onEdit, onResources, onArchive, archiving }) {
  const state = STATUS[project.status] ?? STATUS.active;
  return (
    <article className="rounded-2xl border border-cyan-300/10 bg-[#04101d]/72 p-4 shadow-[0_8px_36px_rgba(0,0,0,.28),0_0_30px_rgba(0,119,255,.045)] backdrop-blur-xl transition hover:border-cyan-300/25 hover:bg-[#061522]/80 hover:shadow-[0_8px_36px_rgba(0,0,0,.30),0_0_32px_rgba(0,119,255,.09)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-white">{project.name}</h3>
          <p className={`mt-1 text-[10px] font-medium uppercase tracking-wide ${PRIORITY[project.priority] ?? 'text-zinc-400'}`}>{project.priority} priority</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] ${state.cls}`}>{state.label}</span>
      </div>
      <p className="mt-3 min-h-10 text-xs leading-5 text-zinc-400">{project.description || 'No description.'}</p>
      {(project.tags ?? []).length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{project.tags.map((tag) => <span key={tag} className="rounded-md border border-cyan-300/5 bg-white/[.035] px-2 py-1 text-[10px] text-zinc-400">{tag}</span>)}</div>}
      <div className="mt-4 flex items-center gap-2 border-t border-cyan-300/10 pt-3 text-[10px] text-zinc-500">
        <CalendarDays className="h-3 w-3 text-cyan-300/55" />
        <span>{project.due_at ? `Due ${new Date(project.due_at).toLocaleDateString()}` : `Updated ${new Date(project.updated_at).toLocaleDateString()}`}</span>
        <div className="ml-auto flex gap-1.5">
          <button onClick={onResources} className="flex items-center gap-1 rounded-lg border border-cyan-300/10 px-2 py-1 text-cyan-300 hover:bg-cyan-500/10"><Link2 className="h-3 w-3" />Resources</button>
          <button onClick={onEdit} className="rounded-lg border border-white/10 px-2 py-1 text-zinc-300 hover:bg-white/5">Edit</button>
          {project.status !== 'archived' && <button disabled={archiving} onClick={onArchive} className="rounded-lg border border-white/10 p-1.5 text-zinc-400 hover:bg-white/5" title="Archive project"><Archive className="h-3 w-3" /></button>}
        </div>
      </div>
    </article>
  );
}

function ResourceManager({ project, onClose }) {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listProjectResources);
  const addFn = useServerFn(addProjectResource);
  const removeFn = useServerFn(removeProjectResource);
  const key = ['project-resources', project.id];
  const q = useQuery({ queryKey: key, queryFn: () => listFn({ data: { projectId: project.id } }), retry: false });
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  const addMutation = useMutation({
    mutationFn: ({ resourceType, resourceId }) => addFn({ data: { projectId: project.id, resourceType, resourceId } }),
    onSuccess: refresh,
  });
  const removeMutation = useMutation({
    mutationFn: (linkId) => removeFn({ data: { projectId: project.id, linkId } }),
    onSuccess: refresh,
  });

  const links = q.data?.links ?? [];
  const linkedKey = new Map(links.map((link) => [`${link.resource_type}:${link.resource_id}`, link]));
  const agents = q.data?.agents ?? [];
  const workflows = q.data?.workflows ?? [];
  const error = q.error || addMutation.error || removeMutation.error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col rounded-2xl border border-white/10 bg-[#0c0d13] shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/10 p-5">
          <div><p className="text-[10px] uppercase tracking-wide text-violet-300">Project resources</p><h2 className="mt-1 text-base font-semibold text-white">{project.name}</h2><p className="mt-1 text-xs text-zinc-500">Link only agents and workflows from this same workspace.</p></div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        <div className="overflow-y-auto p-5">
          {error && <div className="mb-4 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs text-rose-200">{friendlyMessage(error)}</div>}
          {q.isLoading ? (
            <div className="flex justify-center py-12 text-zinc-500"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="space-y-6">
              <ResourceSection
                title="AI agents"
                icon={Bot}
                type="agent"
                rows={agents}
                linkedKey={linkedKey}
                onAdd={(id) => addMutation.mutate({ resourceType: 'agent', resourceId: id })}
                onRemove={(id) => removeMutation.mutate(id)}
                pending={addMutation.isPending || removeMutation.isPending}
              />
              <ResourceSection
                title="Workflows"
                icon={Workflow}
                type="workflow"
                rows={workflows}
                linkedKey={linkedKey}
                onAdd={(id) => addMutation.mutate({ resourceType: 'workflow', resourceId: id })}
                onRemove={(id) => removeMutation.mutate(id)}
                pending={addMutation.isPending || removeMutation.isPending}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-[10px] text-zinc-600">
          <span>{links.length} linked resource{links.length === 1 ? '' : 's'}</span>
          <button onClick={onClose} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5">Done</button>
        </div>
      </div>
    </div>
  );
}

function ResourceSection({ title, icon: Icon, type, rows, linkedKey, onAdd, onRemove, pending }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2"><Icon className="h-4 w-4 text-violet-300" /><h3 className="text-sm font-semibold text-white">{title}</h3><span className="text-[10px] text-zinc-600">{rows.length} available</span></div>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-zinc-600">No {title.toLowerCase()} exist in this workspace yet.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((row) => {
            const link = linkedKey.get(`${type}:${row.id}`);
            return (
              <div key={row.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-violet-300"><Icon className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-white">{row.name}</p><p className="truncate text-[10px] text-zinc-600">{row.category || row.description || row.status || type}</p></div>
                {link ? (
                  <button disabled={pending} onClick={() => onRemove(link.id)} className="flex items-center gap-1 rounded-lg border border-rose-400/20 px-2.5 py-1.5 text-[10px] text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"><Unlink className="h-3 w-3" />Unlink</button>
                ) : (
                  <button disabled={pending} onClick={() => onAdd(row.id)} className="flex items-center gap-1 rounded-lg border border-violet-400/20 px-2.5 py-1.5 text-[10px] text-violet-300 hover:bg-violet-500/10 disabled:opacity-50"><Link2 className="h-3 w-3" />Link</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ProjectForm({ title, submitLabel, project, scope, onClose, onSubmit, pending, error }) {
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [status, setStatus] = useState(project?.status ?? 'active');
  const [priority, setPriority] = useState(project?.priority ?? 'normal');
  const [tags, setTags] = useState((project?.tags ?? []).join(', '));
  const [dueAt, setDueAt] = useState(project?.due_at ? project.due_at.slice(0, 10) : '');

  const submit = (e) => {
    e.preventDefault();
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      priority,
      tags: tags.split(',').map((v) => v.trim()).filter(Boolean).slice(0, 20),
      dueAt: dueAt ? new Date(`${dueAt}T12:00:00.000Z`).toISOString() : null,
    };
    if (!project) payload.orgId = scope ?? null;
    if (project) payload.status = status;
    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0c0d13] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-base font-semibold text-white">{title}</h2><button type="button" onClick={onClose} className="text-zinc-500 hover:text-white"><X className="h-4 w-4" /></button></div>
        <div className="space-y-3">
          <Field label="Name"><input required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className="input" /></Field>
          <Field label="Description"><textarea maxLength={2000} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="input resize-none" /></Field>
          <div className="grid grid-cols-2 gap-3">
            {project && <Field label="Status"><select value={status} onChange={(e) => setStatus(e.target.value)} className="input"><option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option><option value="archived">Archived</option></select></Field>}
            <Field label="Priority"><select value={priority} onChange={(e) => setPriority(e.target.value)} className="input"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></Field>
          </div>
          <Field label="Tags" hint="Comma separated"><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="client, automation, launch" className="input" /></Field>
          <Field label="Due date"><input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="input" /></Field>
        </div>
        {error && <p className="mt-3 text-xs text-rose-300">{friendlyMessage(error)}</p>}
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-xs text-zinc-300">Cancel</button><button disabled={pending || !name.trim()} className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-50">{pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{submitLabel}</button></div>
      </form>
      <style>{`.input{width:100%;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.22);border-radius:.75rem;padding:.55rem .7rem;font-size:.75rem;color:white;outline:none}.input:focus{border-color:rgba(167,139,250,.45)}.input option{background:#11131a}`}</style>
    </div>
  );
}

function Field({ label, hint, children }) {
  return <label className="block"><span className="mb-1 flex items-center justify-between text-[11px] font-medium text-zinc-400"><span>{label}</span>{hint && <span className="font-normal text-zinc-600">{hint}</span>}</span>{children}</label>;
}
