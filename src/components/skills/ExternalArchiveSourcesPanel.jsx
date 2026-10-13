import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { BookOpen, ExternalLink, LockKeyhole, Search, ShieldCheck } from 'lucide-react';
import {
  EXTERNAL_ARCHIVE_SOURCES, EXTERNAL_SKILL_CANDIDATES, externalSourceStats,
} from '@/lib/runtime/agent-skills/external-source-catalog';
import {
  importExternalArchiveSkillDraft, listImportedArchiveSkillDrafts,
} from '@/lib/runtime/agent-skills/external-source-catalog.functions';
import { useToast } from '@/components/ui/use-toast';
import { friendlyMessage } from '@/lib/errors';

/**
 * Audited external software is NOT represented as connected. This component
 * exposes all 7 packages / 178 skill references, each with provenance, and
 * allows an owner to request a disabled, security-scanned skill draft.
 */
export default function ExternalArchiveSourcesPanel({ enabled = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [sourceId, setSourceId] = useState('all');
  const [page, setPage] = useState(0);
  const [lastImported, setLastImported] = useState(null);
  const qc = useQueryClient();
  const { toast } = useToast();
  const importFn = useServerFn(importExternalArchiveSkillDraft);
  const listFn = useServerFn(listImportedArchiveSkillDrafts);
  const stats = externalSourceStats();

  const installed = useQuery({
    queryKey: ['external-archive-skill-drafts'], enabled: enabled && open,
    queryFn: () => listFn({data:{}}), retry: false,
  });
  const importedBySource = useMemo(() => new Map(
    (installed.data?.imported ?? []).map(item => [item.source_ref, item]),
  ), [installed.data]);

  const importDraft = useMutation({
    mutationFn: (candidate) => importFn({ data: {sourceId:candidate.sourceId,slug:candidate.slug} }),
    onSuccess: (result) => {
      setLastImported(result.skill.name);
      toast({title:'Skill review draft saved',description:'Stored in the existing Skills Registry and disabled until reviewed and certified.'});
      qc.invalidateQueries({queryKey:['external-archive-skill-drafts']});
      qc.invalidateQueries({queryKey:['agent-skills']});
    },
    onError: error => toast({variant:'destructive',title:'External skill not imported',description:friendlyMessage(error)}),
  });
  const selected=useMemo(() => EXTERNAL_SKILL_CANDIDATES.filter(item => {
    if (sourceId !== 'all' && item.sourceId !== sourceId) return false;
    const search=query.trim().toLowerCase();
    return !search || `${item.title} ${item.slug} ${item.category}`.toLowerCase().includes(search);
  }),[sourceId,query]);
  const count=30;
  const visible=selected.slice(page*count,(page+1)*count);
  const pageCount=Math.max(1,Math.ceil(selected.length/count));

  return (
    <section className="mb-5 rounded-2xl border border-violet-300/15 bg-black/25 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs uppercase tracking-[.15em] text-violet-300"><BookOpen className="h-4 w-4"/>Audited external source library</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Research skills &amp; trusted integration candidates</h2>
          <p className="mt-1 max-w-3xl text-xs text-zinc-400">
            {stats.archives} reviewed archives · {stats.scientificSkills} scientific skill descriptions · {stats.diagramSkills} diagram skill.
            References are <strong className="text-amber-200">not executable tools</strong>. External memory and browser engines stay disconnected until individually configured and security-certified.
          </p>
        </div>
        <button type="button" onClick={() => setOpen(v=>!v)} aria-expanded={open}
          className="rounded-xl border border-violet-300/20 px-3 py-2 text-xs font-medium text-violet-200 hover:bg-violet-300/10">
          {open ? 'Hide source library' : 'Explore all seven archives'}
        </button>
      </div>
      {open && <div className="mt-4 space-y-4">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {EXTERNAL_ARCHIVE_SOURCES.map(source => (
            <article key={source.id} className="rounded-xl border border-white/[.08] bg-white/[.025] p-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-zinc-100">{source.name}</h3>
                <span className="shrink-0 rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-zinc-400">{source.license}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">{source.summary}</p>
              <p className="mt-2 text-[11px] text-zinc-500">Reuses: {source.integratesWith.join(' · ')}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-amber-200">{
                  (source.id==='agentmemory'||source.id==='openviking') && installed.data?.mcpLinks?.some(link=>link.sourceId===source.id)
                    ? (installed.data.mcpLinks.find(link=>link.sourceId===source.id)?.enabled ? 'MCP configured · health not verified' : 'MCP saved · disabled')
                    : source.status === 'external-worker' ? 'Needs separate worker'
                    : source.status === 'review-required' ? 'Licence & security review' : 'Reference catalogue only'
                }</span>
                {source.url && <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200">Source <ExternalLink className="h-3 w-3"/></a>}
              </div>
            </article>
          ))}
        </div>
        <div className="rounded-xl border border-white/10 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-medium text-white"><Search className="h-4 w-4 text-violet-300"/>178 source skill definitions</h3>
              <p className="mt-1 text-xs text-zinc-500">Individual imports use Blackstar's existing owner-scoped agent_skills table and security scanner. Each draft is disabled; no downloaded code is executed.</p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-200"><LockKeyhole className="h-3.5 w-3.5"/>No automatic installation</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <input aria-label="Search external skill catalogue" value={query}
              onChange={e=>{setQuery(e.target.value);setPage(0);}}
              placeholder="Search science, statistics, medicine, diagrams…"
              className="min-w-[180px] flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-violet-400"/>
            <select aria-label="Filter skill source" value={sourceId} onChange={e=>{setSourceId(e.target.value);setPage(0);}}
              className="rounded-lg border border-white/10 bg-[#131018] px-2 py-2 text-xs text-zinc-100">
              <option value="all">Both skill sources</option>
              <option value="scientific-agent-skills">177 scientific skills</option>
              <option value="diagram-design">Diagram Design</option>
            </select>
          </div>
          <p className="mt-2 text-xs text-zinc-500">{selected.length} matching skill definitions{installed.isError ? ' · Imported-draft status unavailable' : ''}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map(candidate => {
              const item=importedBySource.get(candidate.sourceUrl.replace('/blob/','/').replace('github.com','raw.githubusercontent.com'));
              // An imported record is keyed by its fixed source reference, not title.
              const isImported=Boolean(item) || lastImported === (candidate.sourceId === 'diagram-design' ? 'design-' : 'science-') + candidate.slug;
              return <article key={candidate.id} className="rounded-lg border border-white/[.07] bg-white/[.025] p-3">
                <h4 className="text-xs font-semibold text-zinc-200">{candidate.title}</h4>
                <p className="mt-1 text-[11px] text-zinc-500">{candidate.category} · {candidate.license} · {candidate.status}</p>
                {candidate.requiresReview && <p className="mt-1 text-[10px] text-amber-200">Human review required</p>}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <a href={candidate.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-violet-300">Read instructions <ExternalLink className="h-3 w-3"/></a>
                  <button type="button" disabled={importDraft.isPending || isImported} onClick={()=>importDraft.mutate(candidate)}
                    className="rounded-md border border-white/10 px-2 py-1.5 text-[11px] text-zinc-200 disabled:opacity-40 hover:border-violet-300/40">
                    {isImported ? 'Draft imported' : importDraft.isPending && importDraft.variables?.id===candidate.id ? 'Scanning…' : 'Import disabled draft'}
                  </button>
                </div>
              </article>;
            })}
          </div>
          {selected.length>count && <div className="mt-3 flex items-center justify-between gap-2">
            <button type="button" disabled={page===0} onClick={()=>setPage(Math.max(page-1,0))} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs disabled:opacity-40">Previous</button>
            <span className="text-xs text-zinc-400">Page {page+1} of {pageCount}</span>
            <button type="button" disabled={page>=pageCount-1} onClick={()=>setPage(Math.min(page+1,pageCount-1))} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs disabled:opacity-40">Next</button>
          </div>}
        </div>
        <p className="text-xs text-zinc-400">Memory services that offer a compatible MCP endpoint can be added using Blackstar's existing <a href="/mcp-hub" className="text-violet-300 underline">MCP Hub</a>. The source card only reports an owner-scoped saved connection; it does not imply the service is reachable or that permissions have been granted. Browser Use must use the existing <a href="/browser-preview" className="text-violet-300 underline">Browser</a> policy path.</p>
        <p className="flex items-start gap-2 text-xs text-zinc-400"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-300"/>
          This library does not install upstream binaries, grant browser authority, replace Memory Fabric, contact clinical services or bypass the Approval Centre. Imported playbooks remain disabled until explicitly reviewed and verified.
        </p>
      </div>}
    </section>
  );
}
