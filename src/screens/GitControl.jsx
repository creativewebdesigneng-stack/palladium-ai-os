import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, GitBranch, GitCommitHorizontal, Github, LockKeyhole, Plug, RefreshCw, ShieldCheck } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import {
  getGitHubConnection,
  listConnectedGitHubBranches,
  listConnectedGitHubCommits,
  listConnectedGitHubRepositories,
  startGitHubConnection,
} from '@/lib/integrations/github.functions';

export default function GitControl() {
  const [connection, setConnection] = useState(null);
  const [repositories, setRepositories] = useState([]);
  const [repository, setRepository] = useState('');
  const [branches, setBranches] = useState([]);
  const [branch, setBranch] = useState('');
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedRepository = useMemo(
    () => repositories.find((item) => item.fullName === repository) ?? null,
    [repositories, repository],
  );

  async function loadConnection() {
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
      setError(err instanceof Error ? err.message : 'Could not load GitHub version-control data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConnection();
  }, []);

  useEffect(() => {
    if (!repository) {
      setBranches([]);
      setBranch('');
      setCommits([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setDataLoading(true);
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
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load repository branches.');
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [repository, selectedRepository?.defaultBranch]);

  useEffect(() => {
    if (!repository || !branch) return;
    let cancelled = false;
    (async () => {
      setDataLoading(true);
      setError('');
      try {
        const rows = await listConnectedGitHubCommits({ data: { repository, ref: branch, perPage: 30 } });
        if (!cancelled) setCommits(rows);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load repository commits.');
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [repository, branch]);

  async function connectGitHub() {
    setError('');
    try {
      const result = await startGitHubConnection({ data: { origin: window.location.origin } });
      window.location.assign(result.installUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the GitHub connection.');
    }
  }

  const protectedCount = branches.filter((item) => item.protected).length;

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Git & Version Control"
        description="Inspect real GitHub repositories, branches and commits with server-side read-only credentials. Repository mutations remain disabled."
        action={connection?.connected ? (
          <button onClick={loadConnection} className="flex items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2 text-sm text-zinc-300 hover:bg-white/5">
            <RefreshCw className="h-4 w-4" />Refresh
          </button>
        ) : null}
      />

      {error && <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-500/[.06] p-4 text-sm text-red-200">{error}</div>}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-8 text-center text-sm text-zinc-500">Checking GitHub connection…</div>
      ) : !connection?.configured ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[.06] p-5">
          <div className="flex gap-3"><LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" /><div><p className="text-sm font-semibold text-amber-100">GitHub App deployment setup is incomplete</p><p className="mt-1 text-xs leading-5 text-amber-100/70">Configure the GitHub App server secrets before version-control data can be connected. No repository token belongs in browser environment variables.</p></div></div>
        </div>
      ) : !connection?.connected ? (
        <div className="rounded-2xl border border-violet-400/20 bg-violet-500/[.06] p-6">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-200"><Github className="h-5 w-5" /></span>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-white">Connect GitHub to Version Control</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-400">Choose the repositories PalladiumAI may read. Branch and commit data will come directly from that installation rather than fixture records.</p>
              <button onClick={connectGitHub} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-400"><Plug className="h-4 w-4" />Connect GitHub</button>
            </div>
          </div>
        </div>
      ) : repositories.length === 0 ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[.06] p-5 text-sm text-amber-100">GitHub is connected, but this installation has no repositories available to PalladiumAI.</div>
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={Github} label="Connected account" value={connection.accountLabel || 'GitHub'} />
            <Metric icon={GitBranch} label="Repositories" value={repositories.length} />
            <Metric icon={ShieldCheck} label="Protected branches" value={protectedCount} />
            <Metric icon={LockKeyhole} label="Repository access" value="Read only" />
          </div>

          <div className="grid gap-4 xl:grid-cols-[20rem_1fr]">
            <aside className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
              <label className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">Repository</label>
              <select value={repository} onChange={(event) => setRepository(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0c12] px-3 py-2.5 text-sm text-white outline-none">
                {repositories.map((item) => <option key={item.id} value={item.fullName}>{item.fullName}{item.private ? ' · private' : ''}</option>)}
              </select>

              <label className="mt-4 block text-[10px] font-medium uppercase tracking-wide text-zinc-600">Branch</label>
              <select value={branch} onChange={(event) => setBranch(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0c12] px-3 py-2.5 text-sm text-white outline-none">
                {branches.map((item) => <option key={item.name} value={item.name}>{item.name}{item.protected ? ' · protected' : ''}</option>)}
              </select>

              <div className="mt-5 border-t border-white/10 pt-4">
                <p className="text-xs font-semibold text-zinc-300">Branches</p>
                <div className="mt-2 space-y-1">
                  {branches.map((item) => (
                    <button key={item.name} onClick={() => setBranch(item.name)} className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-xs ${branch === item.name ? 'bg-violet-500/10 text-violet-200' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'}`}>
                      <span className="flex min-w-0 items-center gap-2"><GitBranch className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{item.name}</span></span>
                      {item.protected && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <section className="rounded-2xl border border-white/10 bg-white/[.025]">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-white">Recent commits</h2>
                  <p className="mt-1 text-[11px] text-zinc-600">{repository} · {branch}</p>
                </div>
                {selectedRepository?.htmlUrl && <a href={selectedRepository.htmlUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white">Open on GitHub<ExternalLink className="h-3.5 w-3.5" /></a>}
              </div>

              <div className="divide-y divide-white/[.06]">
                {dataLoading ? (
                  <p className="p-5 text-sm text-zinc-500">Loading live GitHub history…</p>
                ) : commits.length === 0 ? (
                  <p className="p-5 text-sm text-zinc-500">No commits were returned for this branch.</p>
                ) : commits.map((commit) => (
                  <div key={commit.sha} className="flex gap-3 p-4">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[.04] text-zinc-400"><GitCommitHorizontal className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 whitespace-pre-line text-sm font-medium leading-5 text-zinc-200">{commit.message}</p>
                        <span className="shrink-0 rounded-md bg-white/[.04] px-2 py-1 font-mono text-[10px] text-zinc-500">{commit.sha.slice(0, 8)}</span>
                      </div>
                      <p className="mt-1.5 text-[11px] text-zinc-600">{commit.authorName || 'Unknown author'}{commit.authorDate ? ` · ${new Date(commit.authorDate).toLocaleString()}` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-500/[.04] p-4">
            <p className="flex items-center gap-2 text-xs font-semibold text-emerald-200"><LockKeyhole className="h-4 w-4" />Write actions remain locked</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">This GitHub App slice cannot create branches, commits, pull requests or issues. Those capabilities will only be introduced with explicit write permissions, exact diffs and PalladiumAI approval controls.</p>
          </div>
        </>
      )}
    </>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><Icon className="h-4 w-4" /></span>
      <div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{value}</p><p className="mt-0.5 text-[10px] text-zinc-600">{label}</p></div>
    </div>
  );
}
