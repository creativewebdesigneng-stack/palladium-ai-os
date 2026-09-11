import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { Film, Loader2, ShieldCheck } from 'lucide-react'
import { friendlyMessage } from '@/lib/errors'
import { auditCinemaMasterReadiness, submitCinemaMaster } from '@/lib/cinema/cinema-master.functions'

export default function CinemaMasterPanel({project,workerConfigured}){
  const qc=useQueryClient(),auditFn=useServerFn(auditCinemaMasterReadiness),submitFn=useServerFn(submitCinemaMaster)
  const audit=useMutation({mutationFn:()=>auditFn({data:{id:project.id}})})
  const submit=useMutation({mutationFn:()=>submitFn({data:{id:project.id}}),onSuccess:()=>qc.invalidateQueries({queryKey:['cinema-studio']})})
  const result=audit.data
  return <div className="mt-4 rounded-xl border border-white/8 bg-black/25 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-white/30">Feature-film master</p><p className="mt-1 text-xs text-white/45">Verify all rendered shot segments before final edit, audio mix, colour grade and master assembly.</p></div><div className="flex gap-2"><button disabled={audit.isPending} onClick={()=>audit.mutate()} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 disabled:opacity-30">{audit.isPending?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<ShieldCheck className="h-3.5 w-3.5"/>}Audit master</button><button disabled={!workerConfigured||!result?.ready||submit.isPending} onClick={()=>submit.mutate()} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300/15 bg-emerald-300/[.06] px-2.5 py-1.5 text-xs text-emerald-200 disabled:opacity-30">{submit.isPending?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<Film className="h-3.5 w-3.5"/>}Assemble feature film</button></div></div>
    {result&&<div className="mt-3"><div className="flex flex-wrap gap-2 text-[10px] text-zinc-500"><span>{result.timeline.length} completed segments</span><span>·</span><span>{Math.round(result.assembledDurationSeconds/60)} min assembled</span><span>·</span><span>{Math.round(result.coverage*100)}% target coverage</span><span>·</span><span className={result.ready?'text-emerald-300':'text-amber-300'}>{result.ready?'Ready for master':'Blocked'}</span></div>{result.blockers?.length>0&&<div className="mt-2 space-y-1">{result.blockers.slice(0,5).map(item=><p key={item} className="text-[10px] text-amber-200/70">• {item}</p>)}</div>}</div>}
    {!workerConfigured&&<p className="mt-2 text-[10px] text-amber-200/60">CINEMA_STUDIO_WORKER_URL is required only for final assembly; readiness auditing remains available without it.</p>}
    {(audit.error||submit.error)&&<p className="mt-2 text-[10px] text-rose-300">{friendlyMessage(audit.error||submit.error)}</p>}
  </div>
}
