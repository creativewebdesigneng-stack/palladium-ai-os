import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { BookOpen, Download, ExternalLink, ShieldAlert } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { friendlyMessage } from '@/lib/errors';
import { listAgentSkills } from '@/lib/runtime/agent-skills/agent-skills.functions';
import { installScientificSkillBatch, previewScientificSkill } from '@/lib/runtime/agent-skills/scientific-skills.functions';
import { SCIENTIFIC_SKILL_SOURCES, SCIENTIFIC_SKILLS_COMMIT } from '@/lib/runtime/agent-skills/scientific-skill-sources';

const SOURCE_GROUPS = [
  ['Scientific Agent Skills', '177 individually pinned research playbooks; can be installed into your own existing Skills Registry after integrity checks.', 'Catalogued · opt-in import'],
  ['Diagram Design', '44 diagram types with visual/style guidance; renderer and exporter must be connected through Design Studio.', 'Integration pending'],
  ['AgentMemory', 'Session recall, episode consolidation and MCP memory tools; must respect Blackstar Memory Fabric ownership.', 'External memory adapter pending'],
  ['OpenViking', 'Virtual-directory knowledge storage and retrieval; AGPL-3.0 compliance and tenant isolation require review.', 'Licensing review'],
  ['Browser Use', 'Browser interaction/automation; must run inside Blackstar browser-worker policies, never with unrestricted browsing or purchases.', 'Isolated worker adapter pending'],
  ['Harness Engineering (extended)', 'Architecture, tests, agent-loop controls and operational reference material; not an executable plug-in.', 'Reference audit'],
  ['Harness Engineering (compact)', 'Additional agent orchestration and evaluation references; no new agent runtime is needed.', 'Reference audit'],
];
const sourceBase=`https://github.com/K-Dense-AI/scientific-agent-skills/blob/${SCIENTIFIC_SKILLS_COMMIT}/skills`;

export default function ArchiveScientificSkillsPanel({enabled}) {
  const [query,setQuery]=useState('');
  const [shown,setShown]=useState(20);
  const [progress,setProgress]=useState(0);
  const [previewId,setPreviewId]=useState(null);
  const qc=useQueryClient();
  const {toast}=useToast();
  const listFn=useServerFn(listAgentSkills);
  const installFn=useServerFn(installScientificSkillBatch);
  const previewFn=useServerFn(previewScientificSkill);
  const skills=useQuery({
    queryKey:['agent-skills'],
    queryFn:()=>listFn({data:{}}),enabled,retry:false,
  });
  const installed=new Set((skills.data?.skills??[])
    .filter(row=>row.source_kind==='github' && String(row.source_ref??'').startsWith(`scientific-agent-skills:${SCIENTIFIC_SKILLS_COMMIT}:`))
    .map(row=>String(row.source_ref).split(':').at(-1)));
  const filtered=useMemo(()=>{
    const search=query.trim().toLowerCase();
    return SCIENTIFIC_SKILL_SOURCES.filter(row=>!search || row.id.includes(search));
  },[query]);
  const importAll=useMutation({
    mutationFn:async()=>{
      let cursor=0,inserted=0,updated=0;
      const skipped=[];
      setProgress(0);
      while(cursor!==null){
        const r=await installFn({data:{cursor}});
        inserted+=r.inserted;updated+=r.updated;skipped.push(...r.skipped);
        setProgress(cursor+r.processed);
        cursor=r.nextCursor;
      }
      return {inserted,updated,skipped};
    },
    onSuccess:async result=>{
      await qc.invalidateQueries({queryKey:['agent-skills']});
      toast({title:'Scientific reference skills imported',description:
        `${result.inserted} new; ${result.updated} previously imported. ${result.skipped.length} need review. All imported guidance stays disabled until approved.`});
    },
    onError:error=>toast({variant:'destructive',title:'Scientific skill import interrupted',
      description:`${friendlyMessage(error)} Restarting the importer is safe; previously imported records are reused.`}),
  });
  const inspect=useMutation({
    mutationFn:id=>previewFn({data:{id}}),
    onError:error=>toast({variant:'destructive',title:'Could not verify source',
      description:friendlyMessage(error)}),
  });

  return (
    <section className="mb-6 space-y-4 rounded-2xl border border-violet-400/15 bg-white/[0.025] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><BookOpen className="h-4 w-4 text-violet-300" />External knowledge and skills sources</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-400">Seven inspected archives mapped into Blackstar's existing Skills, Memory, Design and Browser subsystems. Only verified skill guidance can be imported here; third-party runtimes and scripts are not silently installed.</p>
        </div>
        <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-zinc-300">{installed.size}/177 scientific references installed</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {SOURCE_GROUPS.map(([title,description,status])=><div key={title} className="rounded-xl border border-white/10 bg-black/25 p-3">
          <h3 className="text-xs font-semibold text-white">{title}</h3>
          <p className="mt-1 text-[11px] leading-4 text-zinc-400">{description}</p>
          <p className="mt-2 text-[10px] uppercase tracking-wide text-violet-200/80">{status}</p>
        </div>)}
      </div>
      <div className="rounded-xl border border-white/10 bg-black/25 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h3 className="text-sm font-semibold text-white">Scientific source catalogue</h3>
            <p className="mt-0.5 text-xs text-zinc-500">177 publisher SKILL.md sources fixed to one Git commit, checked by exact Git blob hash before import.</p>
          </div>
          <button type="button" disabled={importAll.isPending || !enabled}
            onClick={()=>importAll.mutate()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-100 disabled:opacity-40">
            <Download className="h-3.5 w-3.5" />
            {importAll.isPending?`Importing ${progress}/177…`:'Import all 177 for review'}
          </button>
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-amber-200/80"><ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />Imports are initially disabled. The existing security scanner and agent permission rules still apply; scientific Python libraries, APIs and execution environments are not installed by a text skill.</p>
        <label className="mt-3 block text-xs text-zinc-400">
          Search 177 scientific skill names
          <input className="mt-1 block w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-violet-400/50"
            value={query} onChange={e=>{setQuery(e.target.value);setShown(20)}} placeholder="e.g. astropy, genomics, time series…" />
        </label>
        <p className="my-2 text-xs text-zinc-500">{filtered.length} matching sources</p>
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.slice(0,shown).map(item=><div key={item.id} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-white/[0.07] px-2.5 py-2">
            <div className="min-w-0"><p className="truncate text-xs font-medium text-zinc-200">{item.id}</p>
              <p className={installed.has(item.id)?'text-[10px] text-emerald-300':'text-[10px] text-zinc-500'}>{installed.has(item.id)?'Imported · review required':'Publisher source'}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" className="rounded-md border border-white/10 px-1.5 py-1 text-[10px] text-zinc-300"
                onClick={()=>{setPreviewId(item.id);inspect.mutate(item.id)}} disabled={inspect.isPending}>Inspect</button>
              <a href={`${sourceBase}/${item.id}/SKILL.md`} rel="noopener noreferrer" target="_blank" aria-label={`Open source ${item.id}`}
                className="rounded-md border border-white/10 p-1 text-zinc-400"><ExternalLink className="h-3.5 w-3.5" /></a>
            </div>
          </div>)}
        </div>
        {filtered.length>shown && <button className="mt-3 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300"
          onClick={()=>setShown(v=>v+30)}>Show more ({filtered.length-shown} remaining)</button>}
        {inspect.isSuccess && previewId===inspect.data?.id && <div className="mt-3 rounded-xl border border-violet-400/20 bg-violet-400/[0.035] p-3">
          <div className="flex items-center justify-between gap-2"><strong className="text-sm text-white">{inspect.data.id}</strong>
            <button onClick={()=>{inspect.reset();setPreviewId(null)}} className="text-xs text-zinc-400">Close</button></div>
          <p className="mt-2 text-xs leading-5 text-zinc-300">{inspect.data.description}</p>
          <p className="mt-1 text-xs text-zinc-500">Security scan: {inspect.data.scanVerdict}. {inspect.data.note}</p>
          <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 p-2.5 text-[11px] text-zinc-400">{inspect.data.preview}</pre>
        </div>}
      </div>
    </section>
  );
}
