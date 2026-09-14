import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import {
  ArrowLeft, ChevronRight, CircleDot, FileCode2, Folder, GitBranch, GitCommitHorizontal,
  Globe2, History, Loader2, LockKeyhole, MessageSquare, Package, Pencil, Plus, Save, ShieldCheck,
  Trash2, UserPlus, Users, X,
} from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { friendlyMessage } from '@/lib/errors';
import {
  addRepositoryCollaborator,
  addRepositoryIssueComment,
  commitRepositoryFile,
  createRepositoryBranch,
  createRepositoryIssue,
  createRepositoryRelease,
  getRepositoryOverview,
  listCommitChanges,
  listRepositoryCollaborators,
  listRepositoryCommits,
  listRepositoryFiles,
  listRepositoryIssueComments,
  listRepositoryIssues,
  listRepositoryReleases,
  readRepositoryFile,
  removeRepositoryCollaborator,
  setRepositoryIssueStatus,
  updateRepositoryCollaborator,
} from '@/lib/projects/repository.functions';

export default function ProjectRepository() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const overviewFn = useServerFn(getRepositoryOverview);
  const filesFn = useServerFn(listRepositoryFiles);
  const readFileFn = useServerFn(readRepositoryFile);
  const commitsFn = useServerFn(listRepositoryCommits);
  const commitChangesFn = useServerFn(listCommitChanges);
  const commitFileFn = useServerFn(commitRepositoryFile);
  const createBranchFn = useServerFn(createRepositoryBranch);
  const collaboratorsFn = useServerFn(listRepositoryCollaborators);
  const issuesFn = useServerFn(listRepositoryIssues);
  const createIssueFn = useServerFn(createRepositoryIssue);
  const issueStatusFn = useServerFn(setRepositoryIssueStatus);
  const issueCommentsFn = useServerFn(listRepositoryIssueComments);
  const addIssueCommentFn = useServerFn(addRepositoryIssueComment);
  const releasesFn = useServerFn(listRepositoryReleases);
  const createReleaseFn = useServerFn(createRepositoryRelease);
  const addCollaboratorFn = useServerFn(addRepositoryCollaborator);
  const updateCollaboratorFn = useServerFn(updateRepositoryCollaborator);
  const removeCollaboratorFn = useServerFn(removeRepositoryCollaborator);

  const [tab, setTab] = useState('files');
  const [branch, setBranch] = useState('main');
  const [path, setPath] = useState('');
  const [activeFile, setActiveFile] = useState(null);
  const [editor, setEditor] = useState(null);
  const [selectedCommit, setSelectedCommit] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);

  const overviewQuery = useQuery({
    queryKey: ['project-repository', id],
    queryFn: () => overviewFn({ data: { projectId: id } }),
    retry: false,
  });

  const project = overviewQuery.data?.project ?? null;
  const branches = overviewQuery.data?.branches ?? [];
  const effectiveBranch = branches.some((item) => item.name === branch)
    ? branch
    : project?.default_branch || branches[0]?.name || 'main';

  const filesQuery = useQuery({
    queryKey: ['project-repository-files', id, effectiveBranch],
    queryFn: () => filesFn({ data: { projectId: id, branch: effectiveBranch } }),
    enabled: Boolean(id && project),
    retry: false,
  });

  const commitsQuery = useQuery({
    queryKey: ['project-repository-commits', id, effectiveBranch],
    queryFn: () => commitsFn({ data: { projectId: id, branch: effectiveBranch, limit: 60 } }),
    enabled: Boolean(id && project && tab === 'history'),
    retry: false,
  });

  const collaboratorsQuery = useQuery({
    queryKey: ['project-repository-collaborators', id],
    queryFn: () => collaboratorsFn({ data: { projectId: id } }),
    enabled: Boolean(id && project && tab === 'collaborators'),
    retry: false,
  });
  const issuesQuery = useQuery({
    queryKey: ['project-repository-issues', id],
    queryFn: () => issuesFn({ data: { projectId: id } }),
    enabled: Boolean(id && project && tab === 'issues'),
    retry: false,
  });
  const releasesQuery = useQuery({
    queryKey: ['project-repository-releases', id],
    queryFn: () => releasesFn({ data: { projectId: id } }),
    enabled: Boolean(id && project && tab === 'releases'),
    retry: false,
  });

  const invalidateRepository = () => {
    queryClient.invalidateQueries({ queryKey: ['project-repository', id] });
    queryClient.invalidateQueries({ queryKey: ['project-repository-files', id] });
    queryClient.invalidateQueries({ queryKey: ['project-repository-commits', id] });
  };

  const commitMutation = useMutation({
    mutationFn: (data) => commitFileFn({ data }),
    onSuccess: () => {
      invalidateRepository();
      setEditor(null);
      setActiveFile(null);
    },
  });
  const branchMutation = useMutation({
    mutationFn: (data) => createBranchFn({ data }),
    onSuccess: (_, variables) => {
      invalidateRepository();
      setBranch(variables.name);
      setBranchOpen(false);
    },
  });
  const issueMutation = useMutation({
    mutationFn: (data) => createIssueFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-repository-issues', id] });
      setIssueOpen(false);
    },
  });
  const issueStatusMutation = useMutation({
    mutationFn: (data) => issueStatusFn({ data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-repository-issues', id] }),
  });
  const releaseMutation = useMutation({
    mutationFn: (data) => createReleaseFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-repository-releases', id] });
      setReleaseOpen(false);
    },
  });

  const addCollaboratorMutation = useMutation({
    mutationFn: (data) => addCollaboratorFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-repository-collaborators', id] });
      setInviteOpen(false);
    },
  });
  const updateCollaboratorMutation = useMutation({
    mutationFn: (data) => updateCollaboratorFn({ data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-repository-collaborators', id] }),
  });
  const removeCollaboratorMutation = useMutation({
    mutationFn: (userId) => removeCollaboratorFn({ data: { projectId: id, userId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-repository-collaborators', id] }),
  });

  const files = filesQuery.data ?? [];
  const tree = useMemo(() => buildFolderView(files, path), [files, path]);
  const crumbs = path ? path.split('/').filter(Boolean) : [];
  const error = overviewQuery.error || filesQuery.error || commitsQuery.error || collaboratorsQuery.error || issuesQuery.error || releasesQuery.error || commitMutation.error || branchMutation.error || issueMutation.error || issueStatusMutation.error || releaseMutation.error || addCollaboratorMutation.error || updateCollaboratorMutation.error || removeCollaboratorMutation.error;

  async function openFile(filePath) {
    try {
      const file = await readFileFn({ data: { projectId: id, branch: effectiveBranch, path: filePath } });
      setActiveFile(file);
      setEditor(null);
    } catch (err) {
      setActiveFile({ error: friendlyMessage(err), path: filePath });
    }
  }

  async function viewCommit(commit) {
    setSelectedCommit({ ...commit, loading: true, changes: [] });
    try {
      const changes = await commitChangesFn({ data: { projectId: id, commitId: commit.id } });
      setSelectedCommit({ ...commit, loading: false, changes });
    } catch (err) {
      setSelectedCommit({ ...commit, loading: false, changes: [], error: friendlyMessage(err) });
    }
  }

  if (overviewQuery.isLoading) return <div className="flex items-center gap-2 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" />Loading repository…</div>;
  if (!project) return <div className="rounded-2xl border border-white/10 bg-white/[.03] p-6 text-sm text-zinc-400">{friendlyMessage(overviewQuery.error) || 'Repository not found.'} <Link to="/projects" className="text-violet-300">Back to projects</Link></div>;

  return (
    <>
      <div className="mb-4">
        <Link to="/projects" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />Back to repositories</Link>
      </div>
      <PageHeader
        eyebrow="Project Repository"
        title={project.name}
        description={project.description || 'Versioned Blackstar project repository.'}
        action={<span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs ${project.visibility === 'public' ? 'border-emerald-400/20 bg-emerald-500/[.06] text-emerald-200' : 'border-white/10 bg-white/[.03] text-zinc-300'}`}>{project.visibility === 'public' ? <Globe2 className="h-3.5 w-3.5" /> : <LockKeyhole className="h-3.5 w-3.5" />}{project.visibility}</span>}
      />

      {error && <div className="mb-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-xs text-rose-200">{friendlyMessage(error)}</div>}

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-black/20 p-2">
        <Tab active={tab === 'files'} onClick={() => setTab('files')} icon={FileCode2}>Files</Tab>
        <Tab active={tab === 'history'} onClick={() => setTab('history')} icon={History}>History</Tab>
        <Tab active={tab === 'issues'} onClick={() => setTab('issues')} icon={CircleDot}>Issues</Tab>
        <Tab active={tab === 'releases'} onClick={() => setTab('releases')} icon={Package}>Releases</Tab>
        <Tab active={tab === 'collaborators'} onClick={() => setTab('collaborators')} icon={Users}>Collaborators</Tab>
        <div className="ml-auto flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-violet-300" />
          <select value={effectiveBranch} onChange={(e) => { setBranch(e.target.value); setPath(''); setActiveFile(null); }} className="rounded-xl border border-white/10 bg-[#090b12] px-3 py-2 text-xs text-white">
            {(branches.length ? branches : [{ name: project.default_branch || 'main' }]).map((item) => <option key={item.name} value={item.name}>{item.name}{item.protected ? ' · protected' : ''}</option>)}
          </select>
          <button onClick={() => setBranchOpen(true)} className="rounded-xl border border-white/10 px-2.5 py-2 text-xs text-zinc-400 hover:bg-white/5 hover:text-white"><Plus className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {tab === 'files' && (
        <div className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-white">Repository tree</p>
              <button onClick={() => setEditor({ path: path ? `${path}/new-file.txt` : 'new-file.txt', content: '', message: 'Add file', mimeType: 'text/plain', isNew: true })} className="inline-flex items-center gap-1 rounded-lg border border-violet-400/20 px-2 py-1 text-[10px] text-violet-200 hover:bg-violet-500/10"><Plus className="h-3 w-3" />File</button>
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-1 text-[10px] text-zinc-500">
              <button onClick={() => { setPath(''); setActiveFile(null); }} className="hover:text-white">root</button>
              {crumbs.map((crumb, index) => {
                const next = crumbs.slice(0, index + 1).join('/');
                return <span key={next} className="flex items-center gap-1"><ChevronRight className="h-3 w-3" /><button onClick={() => { setPath(next); setActiveFile(null); }} className="hover:text-white">{crumb}</button></span>;
              })}
            </div>
            <div className="space-y-1">
              {path && <button onClick={() => { setPath(path.split('/').slice(0, -1).join('/')); setActiveFile(null); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-zinc-400 hover:bg-white/5"><Folder className="h-4 w-4 text-violet-300" />..</button>}
              {tree.map((entry) => <button key={entry.path} onClick={() => entry.type === 'folder' ? (setPath(entry.path), setActiveFile(null)) : openFile(entry.path)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-zinc-400 hover:bg-white/5 hover:text-white">{entry.type === 'folder' ? <Folder className="h-4 w-4 shrink-0 text-violet-300" /> : <FileCode2 className="h-4 w-4 shrink-0 text-zinc-500" />}<span className="truncate">{entry.name}</span></button>)}
              {!filesQuery.isLoading && tree.length === 0 && <p className="px-2 py-5 text-center text-xs text-zinc-600">No files here yet.</p>}
            </div>
          </aside>

          <section className="min-w-0 rounded-2xl border border-white/10 bg-white/[.025]">
            {editor ? (
              <FileEditor editor={editor} setEditor={setEditor} pending={commitMutation.isPending} onSave={() => commitMutation.mutate({ projectId: id, branch: effectiveBranch, path: editor.path.trim(), content: editor.content, message: editor.message.trim(), mimeType: editor.mimeType || 'text/plain' })} />
            ) : activeFile ? (
              <FileViewer file={activeFile} onEdit={() => setEditor({ path: activeFile.path, content: activeFile.content, message: `Update ${activeFile.path}`, mimeType: activeFile.mime_type || 'text/plain' })} onDelete={() => commitMutation.mutate({ projectId: id, branch: effectiveBranch, path: activeFile.path, content: null, message: `Delete ${activeFile.path}`, mimeType: activeFile.mime_type || 'text/plain' })} deleting={commitMutation.isPending} />
            ) : (
              <div className="grid min-h-[34rem] place-items-center p-8 text-center"><div><FileCode2 className="mx-auto h-9 w-9 text-zinc-700" /><p className="mt-3 text-sm font-medium text-zinc-300">Select a file to preview it</p><p className="mt-1 text-xs text-zinc-600">Text files are versioned on every save. Each change creates an immutable commit record.</p></div></div>
            )}
          </section>
        </div>
      )}

      {tab === 'history' && <CommitHistory commits={commitsQuery.data ?? []} loading={commitsQuery.isLoading} selected={selectedCommit} onSelect={viewCommit} />}

      {tab === 'issues' && <IssuesPanel issues={issuesQuery.data ?? []} loading={issuesQuery.isLoading} pending={issueStatusMutation.isPending} onNew={() => setIssueOpen(true)} onOpen={setSelectedIssue} onStatus={(issueId, status) => issueStatusMutation.mutate({ projectId: id, issueId, status })} />}

      {tab === 'releases' && <ReleasesPanel releases={releasesQuery.data ?? []} loading={releasesQuery.isLoading} onNew={() => setReleaseOpen(true)} />}

      {tab === 'collaborators' && (
        <Collaborators
          rows={collaboratorsQuery.data ?? []}
          loading={collaboratorsQuery.isLoading}
          pending={addCollaboratorMutation.isPending || updateCollaboratorMutation.isPending || removeCollaboratorMutation.isPending}
          onInvite={() => setInviteOpen(true)}
          onRole={(userId, role) => updateCollaboratorMutation.mutate({ projectId: id, userId, role })}
          onRemove={(userId) => removeCollaboratorMutation.mutate(userId)}
        />
      )}

      {inviteOpen && <InviteCollaborator pending={addCollaboratorMutation.isPending} error={addCollaboratorMutation.error} onClose={() => setInviteOpen(false)} onSubmit={(email, role) => addCollaboratorMutation.mutate({ projectId: id, email, role })} />}
      {branchOpen && <CreateBranchDialog current={effectiveBranch} pending={branchMutation.isPending} error={branchMutation.error} onClose={() => setBranchOpen(false)} onSubmit={(name) => branchMutation.mutate({ projectId: id, name, fromBranch: effectiveBranch })} />}
      {issueOpen && <CreateIssueDialog pending={issueMutation.isPending} error={issueMutation.error} onClose={() => setIssueOpen(false)} onSubmit={(title, body, labels) => issueMutation.mutate({ projectId: id, title, body, labels })} />}
      {releaseOpen && <CreateReleaseDialog commits={commitsQuery.data ?? []} pending={releaseMutation.isPending} error={releaseMutation.error} onClose={() => setReleaseOpen(false)} onSubmit={(data) => releaseMutation.mutate({ projectId: id, ...data })} />}
      {selectedIssue && <IssueDialog projectId={id} issue={selectedIssue} commentsFn={issueCommentsFn} addCommentFn={addIssueCommentFn} onClose={() => setSelectedIssue(null)} />}
    </>
  );
}

function Tab({ active, onClick, icon: Icon, children }) {
  return <button onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium ${active ? 'border-violet-400/25 bg-violet-500/10 text-violet-200' : 'border-transparent text-zinc-500 hover:text-white'}`}><Icon className="h-3.5 w-3.5" />{children}</button>;
}

function buildFolderView(files, prefix) {
  const base = prefix ? `${prefix}/` : '';
  const seen = new Map();
  for (const file of files) {
    if (!file.path.startsWith(base)) continue;
    const rest = file.path.slice(base.length);
    if (!rest) continue;
    const [first, ...tail] = rest.split('/');
    const folder = tail.length > 0;
    const path = folder ? `${base}${first}` : file.path;
    if (!seen.has(path)) seen.set(path, { type: folder ? 'folder' : 'file', name: first, path });
  }
  return [...seen.values()].sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'folder' ? -1 : 1));
}

function FileViewer({ file, onEdit, onDelete, deleting }) {
  if (file.error) return <div className="p-5 text-sm text-rose-300">{file.error}</div>;
  return <><div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-white">{file.path}</p><p className="mt-0.5 text-[10px] text-zinc-600">{file.byte_size?.toLocaleString()} bytes · {file.content_hash}</p></div><div className="flex gap-2"><button onClick={onEdit} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-white/5"><Pencil className="h-3.5 w-3.5" />Edit</button><button disabled={deleting} onClick={onDelete} className="inline-flex items-center gap-1 rounded-lg border border-rose-400/20 px-2.5 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10"><Trash2 className="h-3.5 w-3.5" />Delete</button></div></div><pre className="min-h-[31rem] overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-xs leading-6 text-zinc-300">{file.content}</pre></>;
}

function FileEditor({ editor, setEditor, pending, onSave }) {
  const valid = editor.path.trim() && editor.message.trim();
  return <div><div className="grid gap-3 border-b border-white/10 p-4 lg:grid-cols-[1fr_1fr_auto]"><input value={editor.path} onChange={(e) => setEditor({ ...editor, path: e.target.value })} placeholder="src/example.ts" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white outline-none" /><input value={editor.message} onChange={(e) => setEditor({ ...editor, message: e.target.value })} placeholder="Commit message" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white outline-none" /><div className="flex gap-2"><button onClick={() => setEditor(null)} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-400">Cancel</button><button disabled={pending || !valid} onClick={onSave} className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50">{pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Commit</button></div></div><textarea value={editor.content} onChange={(e) => setEditor({ ...editor, content: e.target.value })} spellCheck={false} className="min-h-[31rem] w-full resize-y bg-transparent p-5 font-mono text-xs leading-6 text-zinc-200 outline-none" /></div>;
}

function CommitHistory({ commits, loading, selected, onSelect }) {
  return <div className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]"><aside className="rounded-2xl border border-white/10 bg-white/[.025] p-3">{loading ? <p className="p-3 text-xs text-zinc-500">Loading commit history…</p> : commits.length === 0 ? <p className="p-3 text-xs text-zinc-600">No commits yet.</p> : commits.map((commit) => <button key={commit.id} onClick={() => onSelect(commit)} className="mb-1 w-full rounded-xl px-3 py-2.5 text-left hover:bg-white/5"><p className="line-clamp-2 text-xs font-medium text-zinc-200">{commit.message}</p><p className="mt-1 flex items-center gap-1 text-[10px] text-zinc-600"><GitCommitHorizontal className="h-3 w-3" />{commit.id.slice(0, 8)} · {new Date(commit.created_at).toLocaleString()}</p></button>)}</aside><section className="rounded-2xl border border-white/10 bg-white/[.025] p-5">{!selected ? <div className="grid min-h-[26rem] place-items-center text-center"><div><History className="mx-auto h-8 w-8 text-zinc-700" /><p className="mt-3 text-sm text-zinc-400">Select a commit to inspect its changed files.</p></div></div> : selected.loading ? <p className="text-sm text-zinc-500">Loading commit changes…</p> : <div><h2 className="text-sm font-semibold text-white">{selected.message}</h2><p className="mt-1 text-[10px] text-zinc-600">{selected.id} · {selected.branch_name}</p>{selected.error && <p className="mt-4 text-xs text-rose-300">{selected.error}</p>}<div className="mt-5 space-y-3">{selected.changes.map((change) => <div key={change.id} className="rounded-xl border border-white/10 bg-black/20"><div className="flex items-center justify-between border-b border-white/10 px-3 py-2"><span className="font-mono text-xs text-zinc-300">{change.path}</span><span className={`text-[10px] ${change.deleted ? 'text-rose-300' : 'text-emerald-300'}`}>{change.deleted ? 'deleted' : 'snapshot'}</span></div>{!change.deleted && <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-[11px] leading-5 text-zinc-400">{change.content}</pre>}</div>)}</div></div>}</section></div>;
}

function Collaborators({ rows, loading, pending, onInvite, onRole, onRemove }) {
  return <section className="rounded-2xl border border-white/10 bg-white/[.025]"><div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><h2 className="text-sm font-semibold text-white">Repository collaborators</h2><p className="mt-1 text-xs text-zinc-600">Viewer can read. Contributor and maintainer can commit repository files.</p></div><button onClick={onInvite} className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-medium text-white"><UserPlus className="h-3.5 w-3.5" />Add collaborator</button></div><div className="divide-y divide-white/[.06]">{loading ? <p className="p-5 text-xs text-zinc-500">Loading collaborators…</p> : rows.length === 0 ? <p className="p-5 text-xs text-zinc-600">No explicit collaborators yet.</p> : rows.map((row) => <div key={row.user_id} className="flex flex-wrap items-center gap-3 p-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500/10 text-violet-200"><Users className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-zinc-200">{row.full_name || row.email || 'Blackstar user'}</p><p className="truncate text-[10px] text-zinc-600">{row.email}</p></div><select disabled={pending} value={row.role} onChange={(e) => onRole(row.user_id, e.target.value)} className="rounded-lg border border-white/10 bg-[#090b12] px-2 py-1.5 text-xs text-zinc-300"><option value="viewer">Viewer</option><option value="contributor">Contributor</option><option value="maintainer">Maintainer</option></select><button disabled={pending} onClick={() => onRemove(row.user_id)} className="rounded-lg border border-rose-400/20 p-2 text-rose-300 hover:bg-rose-500/10"><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div><div className="flex items-center gap-2 border-t border-white/10 px-5 py-3 text-[10px] text-zinc-600"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />Private repositories remain inaccessible to users without an owner, organisation or collaborator grant.</div></section>;
}

function InviteCollaborator({ pending, error, onClose, onSubmit }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm"><form onSubmit={(e) => { e.preventDefault(); onSubmit(email.trim(), role); }} className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0d14] p-5 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-wide text-violet-300">Repository access</p><h2 className="mt-1 text-base font-semibold text-white">Add collaborator</h2></div><button type="button" onClick={onClose} className="text-zinc-500 hover:text-white"><X className="h-4 w-4" /></button></div><label className="mt-5 block text-xs text-zinc-400">Blackstar account email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none" /></label><label className="mt-3 block text-xs text-zinc-400">Role<select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#090b12] px-3 py-2.5 text-sm text-white"><option value="viewer">Viewer</option><option value="contributor">Contributor</option><option value="maintainer">Maintainer</option></select></label>{error && <p className="mt-3 text-xs text-rose-300">{friendlyMessage(error)}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-400">Cancel</button><button disabled={pending || !email.trim()} className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50">{pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Add</button></div></form></div>;
}


function IssuesPanel({ issues, loading, pending, onNew, onOpen, onStatus }) {
  return <section className="rounded-2xl border border-white/10 bg-white/[.025]"><div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><h2 className="text-sm font-semibold text-white">Issues</h2><p className="mt-1 text-xs text-zinc-600">Track bugs, requests and repository work.</p></div><button onClick={onNew} className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-medium text-white"><Plus className="h-3.5 w-3.5" />New issue</button></div><div className="divide-y divide-white/[.06]">{loading ? <p className="p-5 text-xs text-zinc-500">Loading issues…</p> : issues.length === 0 ? <p className="p-5 text-xs text-zinc-600">No issues yet.</p> : issues.map((issue) => <div key={issue.id} className="flex items-start gap-3 p-4"><CircleDot className={`mt-0.5 h-4 w-4 shrink-0 ${issue.status === 'open' ? 'text-emerald-300' : 'text-violet-300'}`} /><button onClick={() => onOpen(issue)} className="min-w-0 flex-1 text-left"><p className="text-sm font-medium text-zinc-200">{issue.title}</p><p className="mt-1 text-[10px] text-zinc-600">#{issue.issue_number} · {issue.status} · updated {new Date(issue.updated_at).toLocaleString()}</p>{(issue.labels ?? []).length > 0 && <div className="mt-2 flex flex-wrap gap-1">{issue.labels.map((label) => <span key={label} className="rounded-md bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-200">{label}</span>)}</div>}</button><button disabled={pending} onClick={() => onStatus(issue.id, issue.status === 'open' ? 'closed' : 'open')} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] text-zinc-400 hover:bg-white/5">{issue.status === 'open' ? 'Close' : 'Reopen'}</button></div>)}</div></section>;
}

function ReleasesPanel({ releases, loading, onNew }) {
  return <section className="rounded-2xl border border-white/10 bg-white/[.025]"><div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><h2 className="text-sm font-semibold text-white">Releases</h2><p className="mt-1 text-xs text-zinc-600">Publish named snapshots tied to repository history.</p></div><button onClick={onNew} className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-medium text-white"><Package className="h-3.5 w-3.5" />New release</button></div><div className="divide-y divide-white/[.06]">{loading ? <p className="p-5 text-xs text-zinc-500">Loading releases…</p> : releases.length === 0 ? <p className="p-5 text-xs text-zinc-600">No releases yet.</p> : releases.map((release) => <div key={release.id} className="p-5"><div className="flex items-center gap-2"><Package className="h-4 w-4 text-violet-300" /><h3 className="text-sm font-semibold text-white">{release.title}</h3><span className="rounded-md border border-white/10 px-2 py-0.5 font-mono text-[10px] text-zinc-400">{release.tag_name}</span>{release.draft && <span className="text-[10px] text-amber-300">Draft</span>}</div><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-zinc-400">{release.notes || 'No release notes.'}</p><p className="mt-2 text-[10px] text-zinc-600">{release.published_at ? `Published ${new Date(release.published_at).toLocaleString()}` : `Created ${new Date(release.created_at).toLocaleString()}`}</p></div>)}</div></section>;
}

function CreateBranchDialog({ current, pending, error, onClose, onSubmit }) {
  const [name, setName] = useState('');
  return <ModalShell title="Create branch" eyebrow={`From ${current}`} onClose={onClose}><form onSubmit={(e) => { e.preventDefault(); onSubmit(name.trim()); }}><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="feature/my-branch" className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none" />{error && <p className="mt-3 text-xs text-rose-300">{friendlyMessage(error)}</p>}<ModalActions pending={pending} disabled={!name.trim()} onClose={onClose} label="Create branch" /></form></ModalShell>;
}

function CreateIssueDialog({ pending, error, onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [labels, setLabels] = useState('');
  return <ModalShell title="New issue" eyebrow="Repository tracking" onClose={onClose}><form onSubmit={(e) => { e.preventDefault(); onSubmit(title.trim(), body.trim() || null, labels.split(',').map((v) => v.trim()).filter(Boolean).slice(0, 20)); }} className="space-y-3"><input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Issue title" className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none" /><textarea rows={7} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Describe the issue…" className="w-full resize-y rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none" /><input value={labels} onChange={(e) => setLabels(e.target.value)} placeholder="Labels, comma separated" className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none" />{error && <p className="text-xs text-rose-300">{friendlyMessage(error)}</p>}<ModalActions pending={pending} disabled={!title.trim()} onClose={onClose} label="Create issue" /></form></ModalShell>;
}

function CreateReleaseDialog({ commits, pending, error, onClose, onSubmit }) {
  const [tagName, setTagName] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [commitId, setCommitId] = useState('');
  const [draft, setDraft] = useState(false);
  return <ModalShell title="New release" eyebrow="Versioned delivery" onClose={onClose}><form onSubmit={(e) => { e.preventDefault(); onSubmit({ tagName: tagName.trim(), title: title.trim(), notes: notes.trim() || null, commitId: commitId || null, draft }); }} className="space-y-3"><div className="grid grid-cols-2 gap-3"><input required value={tagName} onChange={(e) => setTagName(e.target.value)} placeholder="v1.0.0" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none" /><input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Release title" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none" /></div><select value={commitId} onChange={(e) => setCommitId(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#090b12] px-3 py-2.5 text-sm text-white"><option value="">Current repository state</option>{commits.map((commit) => <option key={commit.id} value={commit.id}>{commit.id.slice(0, 8)} · {commit.message}</option>)}</select><textarea rows={7} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Release notes…" className="w-full resize-y rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none" /><label className="flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" checked={draft} onChange={(e) => setDraft(e.target.checked)} />Save as draft</label>{error && <p className="text-xs text-rose-300">{friendlyMessage(error)}</p>}<ModalActions pending={pending} disabled={!tagName.trim() || !title.trim()} onClose={onClose} label="Create release" /></form></ModalShell>;
}

function IssueDialog({ projectId, issue, commentsFn, addCommentFn, onClose }) {
  const queryClient = useQueryClient();
  const commentsQuery = useQuery({ queryKey: ['project-repository-issue-comments', issue.id], queryFn: () => commentsFn({ data: { projectId, issueId: issue.id } }), retry: false });
  const [body, setBody] = useState('');
  const mutation = useMutation({ mutationFn: () => addCommentFn({ data: { projectId, issueId: issue.id, body: body.trim() } }), onSuccess: () => { setBody(''); queryClient.invalidateQueries({ queryKey: ['project-repository-issue-comments', issue.id] }); } });
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"><div className="flex max-h-[88vh] w-full max-w-3xl flex-col rounded-2xl border border-white/10 bg-[#0b0d14] shadow-2xl"><div className="flex items-start justify-between border-b border-white/10 p-5"><div><p className="text-[10px] text-zinc-600">#{issue.issue_number} · {issue.status}</p><h2 className="mt-1 text-base font-semibold text-white">{issue.title}</h2></div><button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="h-4 w-4" /></button></div><div className="overflow-y-auto p-5"><p className="whitespace-pre-wrap text-sm leading-6 text-zinc-300">{issue.body || 'No description.'}</p><div className="my-5 border-t border-white/10" /><h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-white"><MessageSquare className="h-3.5 w-3.5 text-violet-300" />Comments</h3>{commentsQuery.isLoading ? <p className="text-xs text-zinc-500">Loading comments…</p> : <div className="space-y-2">{(commentsQuery.data ?? []).map((comment) => <div key={comment.id} className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="whitespace-pre-wrap text-xs leading-5 text-zinc-300">{comment.body}</p><p className="mt-2 text-[10px] text-zinc-600">{new Date(comment.created_at).toLocaleString()}</p></div>)}</div>}<div className="mt-4 flex gap-2"><textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a comment…" className="flex-1 resize-y rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white outline-none" /><button disabled={mutation.isPending || !body.trim()} onClick={() => mutation.mutate()} className="self-end rounded-xl bg-violet-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50">Comment</button></div>{mutation.error && <p className="mt-2 text-xs text-rose-300">{friendlyMessage(mutation.error)}</p>}</div></div></div>;
}

function ModalShell({ title, eyebrow, onClose, children }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b0d14] p-5 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-wide text-violet-300">{eyebrow}</p><h2 className="mt-1 text-base font-semibold text-white">{title}</h2></div><button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="h-4 w-4" /></button></div>{children}</div></div>;
}

function ModalActions({ pending, disabled, onClose, label }) {
  return <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-400">Cancel</button><button disabled={pending || disabled} className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50">{pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{label}</button></div>;
}
