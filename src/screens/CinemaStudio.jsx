import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { Clapperboard, Film, Loader2, Sparkles } from 'lucide-react'
import PageHeader from '@/components/palladium/PageHeader'
import { useSessionReady } from '@/lib/useSessionReady'
import { friendlyMessage } from '@/lib/errors'
import { createCinemaFilm, getCinemaStudioOverview, planCinemaFilm } from '@/lib/cinema/cinema.functions'

export default function CinemaStudio(){
 const session=useSessionReady(), overviewFn=useServerFn(getCinemaStudioOverview), planFn=useServerFn(planCinemaFilm), createFn=useServerFn(createCinemaFilm)
 const [prompt,setPrompt]=useState(''),[blueprint,setBlueprint]=useState(''),[title,setTitle]=useState('Untitled Film'),[genre,setGenre]=useState('cinematic drama'),[duration,setDuration]=useState(120),[aspect,setAspect]=useState('2.39:1'),[quality,setQuality]=useState('cinema'),[refs,setRefs]=useState('')
 const overview=useQuery({queryKey:['cinema-studio'],queryFn:()=>overviewFn({data:{}}),enabled:session==='yes',retry:false})
 const plan=useMutation({mutationFn:()=>planFn({data:{prompt,durationMinutes:Number(duration),genre,rating:'general audience'}}),onSuccess:r=>setBlueprint(r.blueprint)})
 const render=useMutation({mutationFn:()=>createFn({data:{title,prompt,screenplay:blueprint,durationMinutes:Number(duration),aspectRatio:aspect,quality,references:refs.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)}})})
 const cap=overview.data?.capabilities
 return <><PageHeader eyebrow="Blackstar Creative Intelligence" title="Blackstar Cinema Studio" description="Prompt an original film concept, develop its screenplay and shot architecture, preserve production continuity, and submit long-form scene-based renders to a cinema execution worker."/>
 <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,.9fr)]">
 <section className="rounded-[24px] border border-white/10 bg-black/40 p-5"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-300"/><h2 className="text-sm font-semibold text-white">Film Director</h2></div>
 <p className="mt-2 text-xs text-white/40">Describe an original movie, episode, trailer or cinematic sequence. Blackstar develops a long-form production blueprint rather than pretending a single video-model call can generate a coherent feature film.</p>
 <label className="cs-label">Film prompt<textarea className="cs-input min-h-32" value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="A feature-length science-fiction mystery about…"/></label>
 <div className="grid gap-3 md:grid-cols-2"><label className="cs-label">Title<input className="cs-input" value={title} onChange={e=>setTitle(e.target.value)}/></label><label className="cs-label">Genre<input className="cs-input" value={genre} onChange={e=>setGenre(e.target.value)}/></label></div>
 <div className="grid gap-3 md:grid-cols-3"><label className="cs-label">Runtime minutes<input type="number" min="1" max="180" className="cs-input" value={duration} onChange={e=>setDuration(Number(e.target.value))}/></label><label className="cs-label">Frame<select className="cs-input" value={aspect} onChange={e=>setAspect(e.target.value)}>{['2.39:1','1.85:1','16:9','9:16','1:1'].map(x=><option key={x}>{x}</option>)}</select></label><label className="cs-label">Quality<select className="cs-input" value={quality} onChange={e=>setQuality(e.target.value)}><option value="preview">Preview</option><option value="production">Production</option><option value="cinema">Cinema master</option></select></label></div>
 <button disabled={prompt.trim().length<10||plan.isPending} onClick={()=>plan.mutate()} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-violet-300/20 bg-violet-300/10 px-4 py-2.5 text-sm text-violet-100 disabled:opacity-40">{plan.isPending?<Loader2 className="h-4 w-4 animate-spin"/>:<Clapperboard className="h-4 w-4"/>}Develop film</button>
 {plan.error&&<p className="mt-3 text-xs text-rose-300">{friendlyMessage(plan.error)}</p>}</section>
 <section className="rounded-[24px] border border-white/10 bg-black/40 p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[.2em] text-white/30">Execution</p><h2 className="text-sm font-semibold text-white">Cinema master</h2></div><span className={`text-xs ${cap?.configured?'text-emerald-300':'text-amber-300'}`}>{cap?.configured?'Render worker online':'Planning only'}</span></div>
 <label className="cs-label">Production blueprint / screenplay<textarea className="cs-input min-h-72" value={blueprint} onChange={e=>setBlueprint(e.target.value)} placeholder="Develop the film to create its blueprint."/></label>
 <label className="cs-label">Reference image/video URLs · optional<textarea className="cs-input min-h-20" value={refs} onChange={e=>setRefs(e.target.value)} placeholder="https://…"/></label>
 <button disabled={!cap?.configured||blueprint.length<100||render.isPending} onClick={()=>render.mutate()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-30">{render.isPending?<Loader2 className="h-4 w-4 animate-spin"/>:<Film className="h-4 w-4"/>}Generate film</button>
 {!cap?.configured&&<p className="mt-3 text-[11px] leading-5 text-amber-200/70">Long-form final rendering needs CINEMA_STUDIO_WORKER_URL. Script, scene and shot planning remains usable now; Blackstar will not claim a movie was rendered when no execution worker exists.</p>}
 {render.error&&<p className="mt-3 text-xs text-rose-300">{friendlyMessage(render.error)}</p>}</section></div>
 <section className="mt-4 rounded-[24px] border border-white/10 bg-black/40 p-5"><h2 className="text-sm font-semibold text-white">Long-form architecture</h2><div className="mt-3 grid gap-3 md:grid-cols-4">{[['180 min','Maximum target runtime'],['Scene graph','Long-form orchestration'],['Continuity','Character · location · wardrobe'],['Master','MP4 · MOV']].map(([a,b])=><div key={a} className="rounded-xl border border-white/8 bg-white/[.025] p-4"><p className="text-lg font-semibold text-white">{a}</p><p className="mt-1 text-[11px] text-white/35">{b}</p></div>)}</div></section>
 <style>{`.cs-label{display:block;margin-top:.9rem;font-size:.625rem;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.35)}.cs-input{display:block;width:100%;margin-top:.4rem;border-radius:.75rem;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.35);padding:.65rem .75rem;font-size:.75rem;color:white;outline:none}.cs-input:focus{border-color:rgba(196,181,253,.35)}`}</style></>
}
