import { useMemo, useState } from 'react';
import { BrainCircuit, GitFork, Loader2, ScanSearch, ShieldCheck, TriangleAlert } from 'lucide-react';
import {
  listConnectedGitHubBranches,
  listConnectedGitHubPath,
  listConnectedGitHubRepositories,
  readConnectedGitHubFile,
} from '@/lib/integrations/github.functions';

const SOURCE_EXTENSIONS = /\.(?:[cm]?[jt]sx?|vue|svelte)$/i;
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.next', '.git', 'coverage', 'vendor']);
const MAX_FILES = 180;
const MAX_DIRS = 120;

function importsFrom(content) {
  const values = [];
  const patterns = [
    /\b(?:import|export)\s+(?:[^'\"]*?\s+from\s+)?['\"]([^'\"]+)['\"]/g,
    /\brequire\(\s*['\"]([^'\"]+)['\"]\s*\)/g,
    /\bimport\(\s*['\"]([^'\"]+)['\"]\s*\)/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) values.push(match[1]);
  }
  return [...new Set(values)];
}

function dirname(path) {
  const index = path.lastIndexOf('/');
  return index < 0 ? '' : path.slice(0, index);
}

function normalise(path) {
  const parts = [];
  for (const part of path.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return parts.join('/');
}

function resolveLocalImport(fromPath, specifier, known) {
  if (!specifier.startsWith('.')) return null;
  const base = normalise(`${dirname(fromPath)}/${specifier}`);
  const candidates = [
    base,
    `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, `${base}.mjs`, `${base}.cjs`,
    `${base}/index.ts`, `${base}/index.tsx`, `${base}/index.js`, `${base}/index.jsx`,
  ];
  return candidates.find((candidate) => known.has(candidate)) ?? base;
}

async function discoverFiles(repository, ref) {
  const queue = [''];
  const files = [];
  let scannedDirs = 0;
  while (queue.length && files.length < MAX_FILES && scannedDirs < MAX_DIRS) {
    const path = queue.shift();
    scannedDirs += 1;
    const entries = await listConnectedGitHubPath({ data: { repository, path, ref } });
    for (const entry of entries) {
      if (entry.type === 'dir') {
        const name = entry.path.split('/').pop();
        if (!SKIP_DIRS.has(name) && queue.length + scannedDirs < MAX_DIRS) queue.push(entry.path);
      } else if (SOURCE_EXTENSIONS.test(entry.path) && entry.size <= 512000) {
        files.push(entry);
        if (files.length >= MAX_FILES) break;
      }
    }
  }
  return { files, truncated: Boolean(queue.length) || files.length >= MAX_FILES };
}

export default function RepositoryIntelligencePanel() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);

  async function analyse() {
    if (busy) return;
    setBusy(true);
    setError('');
    setReport(null);
    try {
      const repoResult = await listConnectedGitHubRepositories();
      const repository = repoResult.repositories?.[0];
      if (!repository) throw new Error('Connect at least one GitHub repository before running repository intelligence.');
      const branches = await listConnectedGitHubBranches({ data: { repository: repository.fullName, perPage: 100 } });
      const ref = branches.some((item) => item.name === repository.defaultBranch)
        ? repository.defaultBranch
        : branches[0]?.name || repository.defaultBranch || 'main';
      const discovered = await discoverFiles(repository.fullName, ref);
      const known = new Set(discovered.files.map((item) => item.path));
      const nodes = [];
      const edges = [];
      const unresolved = [];

      for (const entry of discovered.files) {
        const file = await readConnectedGitHubFile({ data: { repository: repository.fullName, path: entry.path, ref } });
        const imports = importsFrom(file.content || '');
        nodes.push({ path: entry.path, imports: imports.length, bytes: entry.size });
        for (const specifier of imports) {
          const target = resolveLocalImport(entry.path, specifier, known);
          if (target) {
            edges.push({ from: entry.path, to: target, resolved: known.has(target) });
            if (!known.has(target)) unresolved.push({ from: entry.path, target });
          }
        }
      }

      const incoming = new Map();
      for (const edge of edges) {
        if (!edge.resolved) continue;
        incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
      }
      const hotspots = nodes
        .map((node) => ({ ...node, dependents: incoming.get(node.path) ?? 0 }))
        .sort((a, b) => b.dependents - a.dependents || b.imports - a.imports)
        .slice(0, 8);
      setReport({
        repository: repository.fullName,
        ref,
        files: nodes.length,
        dependencies: edges.filter((edge) => edge.resolved).length,
        unresolved: unresolved.length,
        hotspots,
        truncated: discovered.truncated,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Repository intelligence failed.');
    } finally {
      setBusy(false);
    }
  }

  const maxDependents = useMemo(() => Math.max(1, ...(report?.hotspots ?? []).map((item) => item.dependents)), [report]);

  return (
    <section className="mt-4 rounded-2xl border border-violet-400/15 bg-violet-500/[.035] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><BrainCircuit className="h-5 w-5" /></span>
          <div>
            <h2 className="text-sm font-semibold text-white">Repository intelligence</h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-500">Static dependency and impact analysis inspired by Understand Anything, implemented on PalladiumAI's existing read-only GitHub App connection. No repository copy, second credential store or write permission is created.</p>
          </div>
        </div>
        <button disabled={busy} onClick={analyse} className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/25 bg-violet-500/10 px-4 py-2 text-xs font-medium text-violet-100 disabled:opacity-40">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}{busy ? 'Indexing…' : 'Analyse default repository'}
        </button>
      </div>

      {error && <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/[.06] p-3 text-xs text-rose-200">{error}</div>}
      {report && <div className="mt-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Source files" value={report.files} icon={BrainCircuit} />
          <Metric label="Resolved dependencies" value={report.dependencies} icon={GitFork} />
          <Metric label="Unresolved local refs" value={report.unresolved} icon={TriangleAlert} />
          <Metric label="Access mode" value="Read only" icon={ShieldCheck} />
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold text-white">Impact hotspots</p><span className="text-[10px] text-zinc-600">{report.repository} · {report.ref}</span>{report.truncated && <span className="rounded-full border border-amber-400/20 px-2 py-0.5 text-[10px] text-amber-300">bounded scan</span>}</div>
          <div className="mt-3 space-y-2">{report.hotspots.map((item) => <div key={item.path} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_110px_90px] md:items-center"><div className="min-w-0"><p className="truncate font-mono text-[11px] text-zinc-300">{item.path}</p><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-violet-400/60" style={{ width: `${Math.max(4, Math.round(item.dependents / maxDependents * 100))}%` }} /></div></div><span className="text-[10px] text-zinc-500">{item.dependents} dependents</span><span className="text-[10px] text-zinc-600">{item.imports} imports</span></div>)}</div>
          <p className="mt-3 text-[10px] leading-4 text-zinc-600">The scan is deliberately bounded to {MAX_FILES} source files and {MAX_DIRS} directories per run so repository analysis cannot become an unbounded browser-side workload.</p>
        </div>
      </div>}
    </section>
  );
}

function Metric({ label, value, icon: Icon }) {
  return <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex items-center gap-2"><Icon className="h-3.5 w-3.5 text-violet-300" /><span className="text-[10px] uppercase tracking-wide text-zinc-600">{label}</span></div><p className="mt-1 text-sm font-semibold text-white">{value}</p></div>;
}
