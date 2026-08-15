import { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  FileCode2,
  Folder,
  GitBranch,
  Github,
  LockKeyhole,
  Plug,
  RefreshCw,
} from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import {
  getGitHubConnection,
  listConnectedGitHubBranches,
  listConnectedGitHubPath,
  listConnectedGitHubRepositories,
  readConnectedGitHubFile,
  startGitHubConnection,
} from '@/lib/integrations/github.functions';

export default function CodeExplorer() {
  const [connection, setConnection] = useState(null);
  const [repositories, setRepositories] = useState([]);
  const [repository, setRepository] = useState('');
  const [branches, setBranches] = useState([]);
  const [branch, setBranch] = useState('');
  const [path, setPath] = useState('');
  const [entries, setEntries] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedRepository = useMemo(
    () => repositories.find((item) => item.fullName === repository) ?? null,
    [repositories, repository],
  );

  async function refreshConnection() {
    setLoading(true);
    setError('');
    try {
      const next = await getGitHubConnection();
      setConnection(next);
      if (next.connected) {
        const result = await listConnectedGitHubRepositories();
        const rows = result.repositories ?? [];
        setRepositories(rows);
        if (rows.length) setRepository((current) => current || rows[0].fullName);
      } else {
        setRepositories([]);
        setRepository('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the GitHub connection.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshConnection();
  }, []);

  useEffect(() => {
    if (!repository) {
      setBranches([]);
      setBranch('');
      setEntries([]);
      setFile(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setContentLoading(true);
      setError('');
      try {
        const rows = await listConnectedGitHubBranches({ data: { repository, perPage: 100 } });
        if (cancelled) return;
        setBranches(rows);
        const preferred = selectedRepository?.defaultBranch;
        const nextBranch = rows.some((item) => item.name === preferred)
          ? preferred
          : rows[0]?.name || preferred || 'main';
        setBranch(nextBranch);
        setPath('');
        setFile(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load repository branches.');
      } finally {
        if (!cancelled) setContentLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [repository, selectedRepository?.defaultBranch]);

  useEffect(() => {
    if (!repository || !branch) return;
    let cancelled = false;
    (async () => {
      setContentLoading(true);
      setError('');
      try {
        const rows = await listConnectedGitHubPath({ data: { repository, path, ref: branch } });
        if (!cancelled) setEntries(rows);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load repository files.');
      } finally {
        if (!cancelled) setContentLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [repository, branch, path]);

  async function connectGitHub() {
    setError('');
    try {
      const result = await startGitHubConnection({ data: { origin: window.location.origin } });
      window.location.assign(result.installUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the GitHub connection.');
    }
  }

  async function openEntry(entry) {
    if (entry.type === 'dir') {
      setPath(entry.path);
      setFile(null);
      return;
    }
    setContentLoading(true);
    setError('');
    try {
      const result = await readConnectedGitHubFile({ data: { repository, path: entry.path, ref: branch } });
      setFile(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read this file.');
    } finally {
      setContentLoading(false);
    }
  }

  const crumbs = path ? path.split('/').filter(Boolean) : [];

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Code Explorer"
        description="Browse authenticated GitHub repositories in read-only mode. Repository tokens remain server-side and source changes are disabled."
        action={connection?.connected ? (
          <button onClick={refreshConnection} className="flex items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2 text-sm text-zinc-300 hover:bg-white/5">
            <RefreshCw className="h-4 w-4" />Refresh
          </button>
        ) : null}
      />

      {error && (
        <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-500/[.06] p-4 text-sm text-red-200">{error}</div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-8 text-center text-sm text-zinc-500">Checking GitHub connection…</div>
      ) : !connection?.configured ? (
        <SetupState />
      ) : !connection?.connected ? (
        <div className="rounded-2xl border border-violet-400/20 bg-violet-500/[.06] p-6">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-200"><Github className="h-5 w-5" /></span>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-white">Connect GitHub</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-400">
                Install the PalladiumAI GitHub App on only the repositories you want available here. PalladiumAI requests repository metadata and contents read access only.
              </p>
              <button onClick={connectGitHub} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-400">
                <Plug className="h-4 w-4" />Connect GitHub
              </button>
            </div>
          </div>
        </div>
      ) : repositories.length === 0 ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[.06] p-5">
          <p className="text-sm font-semibold text-amber-100">GitHub is connected, but no repositories are available.</p>
          <p className="mt-1 text-xs leading-5 text-amber-100/70">Update the GitHub App installation and grant PalladiumAI access to at least one repository.</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[21rem_1fr]">
          <aside className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300"><Github className="h-4 w-4 text-violet-300" />Repository</div>
            <select
              value={repository}
              onChange={(event) => setRepository(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0c12] px-3 py-2.5 text-sm text-white outline-none"
            >
              {repositories.map((item) => <option key={item.id} value={item.fullName}>{item.fullName}{item.private ? ' · private' : ''}</option>)}
            </select>

            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-zinc-300"><GitBranch className="h-4 w-4 text-violet-300" />Branch</div>
            <select
              value={branch}
              onChange={(event) => { setBranch(event.target.value); setPath(''); setFile(null); }}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0c12] px-3 py-2.5 text-sm text-white outline-none"
            >
              {branches.map((item) => <option key={item.name} value={item.name}>{item.name}{item.protected ? ' · protected' : ''}</option>)}
            </select>

            <div className="mt-5 border-t border-white/10 pt-4">
              <div className="mb-3 flex flex-wrap items-center gap-1 text-[11px] text-zinc-500">
                <button onClick={() => { setPath(''); setFile(null); }} className="hover:text-white">root</button>
                {crumbs.map((crumb, index) => {
                  const next = crumbs.slice(0, index + 1).join('/');
                  return <span key={next} className="flex items-center gap-1"><ChevronRight className="h-3 w-3" /><button onClick={() => { setPath(next); setFile(null); }} className="hover:text-white">{crumb}</button></span>;
                })}
              </div>

              <div className="space-y-1">
                {path && (
                  <button
                    onClick={() => { setPath(path.split('/').slice(0, -1).join('/')); setFile(null); }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-zinc-400 hover:bg-white/5 hover:text-white"
                  ><Folder className="h-4 w-4 text-violet-300" />..</button>
                )}
                {entries.map((entry) => (
                  <button key={`${entry.type}:${entry.path}`} onClick={() => openEntry(entry)} className="flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-zinc-400 hover:bg-white/5 hover:text-white">
                    {entry.type === 'dir' ? <Folder className="h-4 w-4 shrink-0 text-violet-300" /> : <FileCode2 className="h-4 w-4 shrink-0 text-zinc-500" />}
                    <span className="truncate">{entry.name}</span>
                  </button>
                ))}
                {!contentLoading && entries.length === 0 && <p className="px-2 py-3 text-xs text-zinc-600">No items in this path.</p>}
              </div>
            </div>
          </aside>

          <section className="min-w-0 rounded-2xl border border-white/10 bg-white/[.025]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{file?.path || `${repository}/${path || ''}`}</p>
                <p className="mt-0.5 text-[10px] text-zinc-600">{branch}{file ? ` · ${file.size.toLocaleString()} bytes · ${file.sha.slice(0, 10)}` : ' · read-only tree'}</p>
              </div>
              <span className="flex items-center gap-1.5 rounded-lg border border-emerald-400/15 bg-emerald-500/[.06] px-2.5 py-1 text-[10px] font-medium text-emerald-300"><LockKeyhole className="h-3 w-3" />Read only</span>
            </div>
            <div className="min-h-[32rem] overflow-auto p-4">
              {contentLoading ? (
                <p className="text-sm text-zinc-500">Loading repository content…</p>
              ) : file ? (
                <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-zinc-300">{file.content}</pre>
              ) : (
                <div className="grid min-h-[26rem] place-items-center text-center">
                  <div>
                    <FileCode2 className="mx-auto h-8 w-8 text-zinc-700" />
                    <p className="mt-3 text-sm font-medium text-zinc-300">Select a file to preview it</p>
                    <p className="mt-1 text-xs text-zinc-600">PalladiumAI currently reads files up to 512 KB and cannot edit or commit from Code Explorer.</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function SetupState() {
  return (
    <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[.06] p-5">
      <div className="flex items-start gap-3">
        <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        <div>
          <p className="text-sm font-semibold text-amber-100">GitHub App deployment setup is incomplete</p>
          <p className="mt-1 max-w-4xl text-xs leading-5 text-amber-100/70">
            Add GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_APP_SLUG, GITHUB_APP_CLIENT_ID and GITHUB_APP_CLIENT_SECRET to the server deployment, then configure the GitHub App callback for PalladiumAI. No repository credentials should be placed in browser environment variables.
          </p>
        </div>
      </div>
    </div>
  );
}
