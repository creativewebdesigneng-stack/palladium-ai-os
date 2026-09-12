import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { Film, Image as ImageIcon, Loader2, RefreshCw } from 'lucide-react'
import { friendlyMessage } from '@/lib/errors'
import { getCinemaRenderOverview, refreshCinemaShotRender, submitCinemaSceneKeyframes, submitCinemaSceneVideoSegments } from '@/lib/cinema/cinema-render.functions'

export default function CinemaSceneRenderPanel({project,scene}){
  const qc=useQueryClient()
  const overviewFn=useServerFn(getCinemaRenderOverview),keyframesFn=useServerFn(submitCinemaSceneKeyframes),videosFn=useServerFn(submitCinemaSceneVideoSegments),refreshFn=useServerFn(refreshCinemaShotRender)
  const overview=useQuery({queryKey:['cinema-renders',project.id],queryFn:()=>overviewFn({data:{projectId:project.id}}),retry:false,refetchInterval:30000})
  const invalidate=()=>qc.invalidateQueries({queryKey:['cinema-renders',project.id]})
  const keyframes=useMutation({mutationFn:()=>keyframesFn({data:{projectId:project.id,sceneId:scene.id,limit:6}}),onSuccess:invalidate})
  const videos=useMutation({mutationFn:()=>videosFn({data:{projectId:project.id,sceneId:scene.id,limitShots:3}}),onSuccess:invalidate})
  const refresh=useMutation({mutationFn:id=>refreshFn({data:{id}}),onSuccess:invalidate})
  const all=overview.data?.renders??[],renders=all.filter(item=>item.scene_id===scene.id)
  const keyframeRows=renders.filter(item=>item.stage==='keyframe'),videoRows=renders.filter(item=>item.stage==='video')
  const completedKeyframes=keyframeRows.filter(item=>item.status==='completed').length,completedVideos=videoRows.filter(item=>item.status==='completed').length
  const shotCount=project.production_manifest?.shotPlans?.[scene.id]?.shots?.length??0
  const seedreamReady=overview.data?.capabilities?.seedream?.configured===true,ltxReady=overview.data?.capabilities?.ltx?.configured===true
  return <div className="mt-3 rounded-lg border border-white/8 bg-black/25 p-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-white/35">Shot rendering</p><p className="mt-1 text-[11px] text-white/45">{completedKeyframes}/{shotCount} keyframes · {completedVideos}/{videoRows.length||0} video segments complete</p></div><div className="flex flex-wrap gap-1.5">
      <button disabled={!seedreamReady||keyframes.isPending||shotCount===0} onClick={()=>keyframes.mutate()} className="inline-flex items-center gap-1 rounded-lg border border-fuchsia-300/15 px-2 py-1 text-[10px] text-fuchsia-200 disabled:opacity-30">{keyframes.isPending?<Loader2 className="h-3 w-3 animate-spin"/>:<ImageIcon className="h-3 w-3"/>}Generate keyframes</button>
      <button disabled={!ltxReady||videos.isPending||completedKeyframes===0} onClick={()=>videos.mutate()} className="inline-flex items-center gap-1 rounded-lg border border-cyan-300/15 px-2 py-1 text-[10px] text-cyan-200 disabled:opacity-30">{videos.isPending?<Loader2 className="h-3 w-3 animate-spin"/>:<Film className="h-3 w-3"/>}Generate video</button>
    </div></div>
    {(!seedreamReady||!ltxReady)&&<p className="mt-2 text-[10px] text-amber-200/65">{overview.data?.capabilities?.diagnostics?.falKeyVisible===false?'Blackstar server cannot see a fal credential in FAL_KEY, FAL_API_KEY or FAL_API_TOKEN. ':''}{!seedreamReady?'Seedream provider unavailable for keyframes. ':''}{!ltxReady?'LTX provider unavailable for video segments.':''}</p>}
    {(keyframes.error||videos.error||overview.error)&&<p className="mt-2 text-[10px] text-rose-300">{friendlyMessage(keyframes.error||videos.error||overview.error)}</p>}
    {renders.length>0&&<div className="mt-2 grid gap-1.5 sm:grid-cols-2">{renders.slice(0,12).map(item=><div key={item.id} className="flex items-center justify-between gap-2 rounded-md border border-white/[.06] px-2 py-1.5"><div className="min-w-0"><p className="truncate text-[10px] text-zinc-300">{item.shot_id} · {item.stage}{item.stage==='video'?` #${item.segment_index+1}`:''}</p><p className="text-[9px] uppercase text-zinc-600">{item.status}</p>{item.error_message&&<p className="mt-0.5 max-w-[260px] text-[9px] normal-case leading-4 text-rose-300">{item.error_message}</p>}</div><div className="flex gap-1">{item.media_job_id&&!['completed','failed','cancelled'].includes(item.status)&&<button onClick={()=>refresh.mutate(item.id)} className="text-zinc-500"><RefreshCw className="h-3 w-3"/></button>}{item.output_url&&<a href={item.output_url} target="_blank" rel="noreferrer" className="text-[9px] text-emerald-300">Open</a>}</div></div>)}</div>}
  </div>
}
