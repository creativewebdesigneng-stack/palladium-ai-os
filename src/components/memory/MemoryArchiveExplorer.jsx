import { useCallback,useEffect,useMemo,useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { Archive, RefreshCcw, FolderTree, ShieldCheck, AlertTriangle } from 'lucide-react'
import { getMemoryArchive } from '@/lib/memory/memory-archive.functions'
import { filterMemoryArchiveEntries } from '@/lib/memory/memory-archive'

const LENSES=[
  ['all','All layers'],['short_term','Short-term'],['long_term','Long-term'],
  ['knowledge','Knowledge'],['organisation','Organisation'],
]
const warn={'expired':'Expired','possible_duplicate':'Potential duplicate','short_term_stale':'Review short-term'}
const trunc=(s,n=90)=>String(s??'').length>n?String(s).slice(0,n)+'…':String(s??'')
export default function MemoryArchiveExplorer({enabled=false,revision=0}){
  const loadFn=useServerFn(getMemoryArchive)
  const [lens,setLens]=useState('all')
  const [archive,setArchive]=useState(null)
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState(null)
  const [shown,setShown]=useState(24)
  const [query,setQuery]=useState('')
  const [folderPath,setFolderPath]=useState('')
  const [reviewKind,setReviewKind]=useState('all')
  const refresh=useCallback(async()=>{
    if(!enabled)return
    setLoading(true);setError(null);setArchive(null)
    try{setArchive(await loadFn({data:{lens}}))}
    catch(err){setError(err instanceof Error?err.message:'Could not load verified memory folders.')}
    finally{setLoading(false)}
  },[enabled,lens,loadFn])
  useEffect(()=>{if(enabled){void refresh()}else setArchive(null)},[enabled,lens,revision])
  const matching=useMemo(()=>filterMemoryArchiveEntries(archive?.entries??[],{
    query,folderPath,reviewKind,reviews:archive?.reviews??[],
  }),[archive,query,folderPath,reviewKind])
  const visible=matching.slice(0,shown)
  const folders=(archive?.folders??[]).filter(folder=>lens==='all'||folder.layer===lens)
  if(!enabled)return null
  return <section className="mb-4 rounded-2xl border border-violet-300/15 bg-black/35 p-4 backdrop-blur-md sm:p-5" aria-label="Memory archive">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><FolderTree className="h-4 w-4 text-violet-300"/>Memory Archive & Review</h2>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-400">
          Browsable virtual folders and lifecycle review suggestions powered by Blackstar's existing owner-protected Memory Fabric. No external memory database, new permissions, or automatic deletion.
        </p>
      </div>
      <button type="button" onClick={()=>void refresh()} disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-zinc-300 disabled:opacity-40">
        <RefreshCcw className="h-3.5 w-3.5"/>Refresh archive
      </button>
    </div>
    <div className="mt-3 flex flex-wrap gap-2">
      {LENSES.map(([value,label])=><button type="button" key={value}
        onClick={()=>{setLens(value);setShown(24);setFolderPath('')}}
        aria-pressed={lens===value}
        className={`rounded-lg border px-2.5 py-1.5 text-xs ${lens===value?'border-violet-400/35 bg-violet-400/10 text-violet-100':'border-white/10 text-zinc-400'}`}>
        {label}{archive&&archive.counts&&value!=='all'?` · ${archive.counts[value]??0}`:''}
      </button>)}
    </div>
    {loading&&<p className="mt-3 text-xs text-zinc-400">Checking authorised memory folders…</p>}
    {error&&<p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
    {archive&&!loading&&<>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-400">
        <span className="rounded-md border border-white/10 px-2 py-1"><Archive className="mr-1 inline h-3 w-3"/> {archive.total} indexed records inspected</span>
        <span className="rounded-md border border-white/10 px-2 py-1">{archive.folders.length} virtual folders</span>
        <span className="rounded-md border border-white/10 px-2 py-1">{archive.reviews.length} review signals</span>
      </div>
      {archive.truncated&&<p className="mt-2 text-xs text-amber-200">This is a bounded preview of your newest records, not a complete archive export.</p>}
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/25 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-white"><FolderTree className="h-3.5 w-3.5"/>Context folders</p>
          <div className="mt-2 max-h-56 space-y-1 overflow-auto">
            {folders.length===0&&<p className="text-xs text-zinc-500">No accessible memories in this layer.</p>}
            {folders.map(folder=><button type="button" key={folder.path}
              onClick={()=>{setFolderPath(folderPath===folder.path?'':folder.path);setShown(24)}}
              aria-pressed={folderPath===folder.path}
              className={`flex w-full items-start justify-between gap-2 rounded-md border px-2 py-1.5 text-left text-xs ${folderPath===folder.path?'border-violet-400/40 bg-violet-400/10':'border-white/[0.05]'}`}>
              <code className="min-w-0 break-all text-violet-200/80">{folder.path}</code>
              <span className="text-zinc-500">{folder.count}</span>
            </button>)}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/25 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-white"><AlertTriangle className="h-3.5 w-3.5"/>Review suggestions</p>
          <p className="mt-1 text-[11px] text-zinc-500">Heuristics, not evidence that a memory is incorrect. Review changes through the existing Memory Vault.</p>
          <div className="mt-2 max-h-56 space-y-2 overflow-auto">
            {archive.reviews.length===0&&<p className="text-xs text-zinc-500">No expiry, exact-duplicate or stale-short-term suggestions in this preview.</p>}
            {archive.reviews.map((item,i)=><div key={item.id+':'+item.kind+':'+i} className="rounded-lg border border-amber-300/10 p-2">
              <p className="text-[11px] font-medium text-amber-200">{warn[item.kind]??'Review'} · {trunc(item.title,48)}</p>
              <p className="mt-1 text-[11px] leading-4 text-zinc-400">{item.reason}</p>
            </div>)}
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3">
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          <label className="text-xs text-zinc-400">Search memory metadata
            <input value={query} maxLength={200} onChange={event=>{setQuery(event.target.value);setShown(24)}}
              placeholder="Title, folder, category or scope"
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-zinc-200"/>
          </label>
          <label className="text-xs text-zinc-400">Review suggestions
            <select value={reviewKind} onChange={event=>{setReviewKind(event.target.value);setShown(24)}}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-zinc-200">
              <option value="all">All records</option>
              {Object.entries(warn).map(([value,label])=><option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        {folderPath&&<button type="button" onClick={()=>{setFolderPath('');setShown(24)}}
          className="mb-2 max-w-full break-all text-left text-xs text-violet-200">Clear folder filter: {folderPath}</button>}
        <p className="mb-2 text-xs font-semibold text-white">Memory entries · {matching.length} matching · {visible.length} shown</p>
        {reviewKind!=='all'&&<p className="mb-2 text-[11px] text-zinc-500">Filtered against the listed review suggestions, capped at 50 signals in this preview.</p>}
        {matching.length===0&&<p className="text-xs text-zinc-500">No records match these filters.</p>}
        <div className="grid gap-1.5 sm:grid-cols-2">
          {visible.map(row=><div key={row.kind+row.id} className="rounded-md border border-white/[0.06] px-2 py-1.5">
            <p className="truncate text-xs text-zinc-200">{row.title}</p>
            <p className="truncate text-[10px] text-zinc-500">{row.layer} · {row.scope} · {row.kind}</p>
          </div>)}
        </div>
        {matching.length>visible.length&&
          <button type="button" className="mt-3 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300" onClick={()=>setShown(count=>count+24)}>Show more entries ({matching.length-visible.length} remaining)</button>}
      </div>
      <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-5 text-zinc-500"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0"/>
        Blackstar remains the source of truth. AgentMemory and OpenViking external servers are not connected and receive no memory data. Their separate services need tenant isolation and, for OpenViking, a licensing review before connection.
      </p>
    </>}
  </section>
}
