import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { CheckCircle2, Fingerprint, Loader2, RefreshCw } from 'lucide-react';
import { friendlyMessage } from '@/lib/errors';
import { useToast } from '@/components/ui/use-toast';
import { listWebIntelligenceSnapshots, snapshotWebIntelligenceJob } from '@/lib/web/web-snapshots.functions';

export default function WebSnapshotPanel({ jobs = [] }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const listFn = useServerFn(listWebIntelligenceSnapshots);
  const snapshotFn = useServerFn(snapshotWebIntelligenceJob);
  const [jobId, setJobId] = useState('');
  const [includeText, setIncludeText] = useState('');
  const [excludeText, setExcludeText] = useState('');
  const snapshots = useQuery({ queryKey: ['web-intelligence-snapshots'], queryFn: () => listFn({ data: undefined }), retry: false });
  const eligibleJobs = useMemo(() => jobs.filter((job) => job.status === 'completed' && job.operation !== 'search'), [jobs]);
  const create = useMutation({
    mutationFn: () => snapshotFn({ data: { jobId, selectors: { include: includeText.split(',').map((value) => value.trim()).filter(Boolean), exclude: excludeText.split(',').map((value) => value.trim()).filter(Boolean) } } }),
    onSuccess: async (result) => { await qc.invalidateQueries({ queryKey: ['web-intelligence-snapshots'] }); toast({ title: result.changed ? 'Page change detected' : 'Snapshot saved', description: result.previous ? (result.changed ? 'The stored result differs from the previous snapshot for this URL.' : 'The content hash matches the previous snapshot.') : 'This is the first snapshot for this URL.' }); },
    onError: (error) => toast({ variant: 'destructive', title: 'Snapshot failed', description: friendlyMessage(error) }),
  });
  const rows = snapshots.data ?? [];
  const previousByUrl = new Map();
  const decorated = rows.map((row) => { const previous = previousByUrl.get(row.source_url); const changed = previous ? previous.content_hash !== row.content_hash : null; previousByUrl.set(row.source_url, row); return { ...row, changed }; });
  const control = 'w-full rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-xs text-white outline-none focus:border-violet-400/40';
  return <section className="mt-4 rounded-2xl border border-white/10 bg-white/[.03] p-5">
    <div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10"><Fingerprint className="h-5 w-5 text-violet-300" /></span><div><h2 className="text-sm font-semibold text-white">Snapshots & change tracking</h2><p className="mt-1 text-xs leading-5 text-zinc-500">Persist hashes from completed PalladiumAI scrape/crawl results and compare them over time. Existing SSRF/public-target policy remains enforced server-side.</p></div></div>
    <div className="mt-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_1fr_1fr_auto]"><select className={control} value={jobId} onChange={(e) => setJobId(e.target.value)}><option value="">Select completed scrape/crawl</option>{eligibleJobs.map((job) => <option key={job.id} value={job.id}>{job.operation} · {job.source}</option>)}</select><input className={control} value={includeText} onChange={(e) => setIncludeText(e.target.value)} placeholder="Include selectors (optional)" /><input className={control} value={excludeText} onChange={(e) => setExcludeText(e.target.value)} placeholder="Exclude selectors (optional)" /><button disabled={!jobId || create.isPending} onClick={() => create.mutate()} className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-40">{create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Snapshot</button></div>
    <div className="mt-4 space-y-2">{snapshots.isLoading ? <Loader2 className="h-4 w-4 animate-spin text-zinc-500" /> : rows.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-zinc-500">No snapshots yet. Complete a scrape or crawl first.</p> : decorated.slice(0, 30).map((row) => <div key={row.id} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex items-center gap-2"><p className="min-w-0 flex-1 truncate text-xs font-medium text-white">{row.source_url}</p>{row.changed === true ? <span className="rounded-full border border-amber-400/20 px-2 py-0.5 text-[10px] text-amber-300">changed</span> : row.changed === false ? <span className="flex items-center gap-1 rounded-full border border-emerald-400/20 px-2 py-0.5 text-[10px] text-emerald-300"><CheckCircle2 className="h-3 w-3" />same hash</span> : <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-500">first</span>}</div><p className="mt-1 font-mono text-[10px] text-zinc-600">sha256 {row.content_hash.slice(0, 18)}… · {new Date(row.created_at).toLocaleString()}</p>{row.excerpt && <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-zinc-600">{row.excerpt}</p>}</div>)}</div>
  </section>;
}
