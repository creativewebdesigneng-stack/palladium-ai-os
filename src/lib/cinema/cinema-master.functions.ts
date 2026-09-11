import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { cinemaSegmentDurations } from './cinema-render.functions'
import { getCinemaRender, submitCinemaMasterAssembly } from './cinema-runtime.server'

type Sb={from:(table:string)=>any}

export function buildCinemaAssemblyManifest(project:any,renders:any[]){
  const production=project?.production_manifest
  const scenes=Array.isArray(production?.scenes)?production.scenes:[]
  const shotPlans=production?.shotPlans&&typeof production.shotPlans==='object'?production.shotPlans:{}
  const blockers:string[]=[]
  const timeline:any[]=[]
  let cursor=0
  for(const scene of scenes){
    const plan=shotPlans[scene.id]
    if(!plan?.shots?.length){blockers.push(`Compile shots for scene: ${scene.title}.`);continue}
    for(const shot of plan.shots){
      const expected=cinemaSegmentDurations(Number(shot.durationSeconds))
      for(let i=0;i<expected.length;i++){
        const render=renders.find(row=>row.scene_id===scene.id&&row.shot_id===shot.id&&row.stage==='video'&&Number(row.segment_index)===i)
        if(!render||render.status!=='completed'||!render.output_url){
          blockers.push(`Complete video segment ${i+1}/${expected.length} for ${scene.title} · ${shot.id}.`)
          continue
        }
        const duration=Number(render.duration_seconds)||expected[i]!
        timeline.push({
          sceneId:scene.id,sceneTitle:scene.title,shotId:shot.id,segmentIndex:i,startSeconds:cursor,durationSeconds:duration,
          videoUrl:render.output_url,framing:shot.framing,camera:shot.camera,dialogue:shot.dialogue||'',audioPrompt:shot.audioPrompt||'',
          continuityNotes:Array.isArray(shot.continuityNotes)?shot.continuityNotes:[],
        })
        cursor+=duration
      }
    }
  }
  if(!scenes.length) blockers.push('Compile the Cinema production scene graph.')
  const targetSeconds=Number(project?.target_duration_minutes||0)*60
  return {
    schema:'blackstar.cinema.master_manifest.v1',
    ready:blockers.length===0,
    project:{id:project.id,title:project.title,aspectRatio:project.aspect_ratio,quality:project.quality,targetDurationSeconds:targetSeconds},
    visualBible:production?.visualBible??{},
    soundBible:production?.soundBible??{},
    timeline,
    assembledDurationSeconds:cursor,
    coverage:targetSeconds>0?Math.min(1,cursor/targetSeconds):0,
    audioMix:{dialogue:true,ambience:true,music:true,effects:true,loudnessTarget:'-14 LUFS streaming / cinema-master worker profile'},
    master:{container:'mp4',alternateContainer:'mov',captions:true,colourGrade:true,finalQc:true},
    blockers,
    note:'This manifest references only completed persisted shot-video outputs. It does not claim the final feature-film master exists until the Cinema worker returns a completed output.',
  }
}

async function loadProjectAndRenders(sb:Sb,userId:string,id:string){
  const [project,renders]=await Promise.all([
    sb.from('cinema_projects').select('id,title,target_duration_minutes,aspect_ratio,quality,status,production_manifest').eq('id',id).eq('user_id',userId).maybeSingle(),
    sb.from('cinema_shot_renders').select('id,scene_id,shot_id,stage,segment_index,duration_seconds,status,output_url').eq('cinema_project_id',id).eq('user_id',userId).order('created_at',{ascending:true})
  ])
  if(project.error) throw new Error(project.error.message)
  if(renders.error) throw new Error(renders.error.message)
  if(!project.data) throw new Error('Cinema project not found.')
  return {project:project.data,renders:renders.data??[]}
}

export const auditCinemaMasterReadiness=createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
  .inputValidator((v:unknown)=>z.object({id:z.string().uuid()}).parse(v))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb
    const {project,renders}=await loadProjectAndRenders(sb,context.userId,data.id)
    return buildCinemaAssemblyManifest(project,renders)
  })

export const submitCinemaMaster=createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
  .inputValidator((v:unknown)=>z.object({id:z.string().uuid()}).parse(v))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb
    const {project,renders}=await loadProjectAndRenders(sb,context.userId,data.id)
    const manifest=buildCinemaAssemblyManifest(project,renders)
    if(!manifest.ready) throw new Error(`Cinema master is not ready: ${manifest.blockers.slice(0,3).join(' ')}`)
    const row=await sb.from('media_generation_jobs').insert({
      user_id:context.userId,provider:'cinema',kind:'video',prompt:`Master assembly: ${project.title}`,aspect_ratio:project.aspect_ratio,
      duration_seconds:Math.max(1,Math.round(manifest.assembledDurationSeconds)),status:'queued',metadata:{cinemaProjectId:data.id,stage:'master',manifest}
    }).select('id').single()
    if(row.error) throw new Error(row.error.message)
    try{
      const result=await submitCinemaMasterAssembly({projectId:data.id,title:project.title,aspectRatio:project.aspect_ratio,quality:project.quality,manifest})
      const terminal=['completed','failed','cancelled'].includes(result.status)
      const update=await sb.from('media_generation_jobs').update({worker_job_id:result.workerJobId,status:result.status,output_url:result.outputUrl,completed_at:terminal?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq('id',row.data.id).eq('user_id',context.userId)
      if(update.error) throw new Error(update.error.message)
      const projectUpdate=await sb.from('cinema_projects').update({status:result.status==='completed'?'completed':'rendering',error_message:null,updated_at:new Date().toISOString()}).eq('id',data.id).eq('user_id',context.userId)
      if(projectUpdate.error) throw new Error(projectUpdate.error.message)
      return {id:row.data.id,...result,manifest}
    }catch(error){
      const message=error instanceof Error?error.message:'Cinema master assembly failed.'
      await sb.from('media_generation_jobs').update({status:'failed',error_message:message.slice(0,1000),completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',row.data.id).eq('user_id',context.userId)
      await sb.from('cinema_projects').update({status:'failed',error_message:message.slice(0,1000),updated_at:new Date().toISOString()}).eq('id',data.id).eq('user_id',context.userId)
      throw error
    }
  })

export const refreshCinemaMaster=createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
  .inputValidator((v:unknown)=>z.object({jobId:z.string().uuid(),projectId:z.string().uuid()}).parse(v))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb
    const job=await sb.from('media_generation_jobs').select('id,worker_job_id').eq('id',data.jobId).eq('user_id',context.userId).eq('provider','cinema').maybeSingle()
    if(job.error) throw new Error(job.error.message)
    if(!job.data?.worker_job_id) throw new Error('Cinema master job has no worker id.')
    const result=await getCinemaRender(String(job.data.worker_job_id))
    const terminal=['completed','failed','cancelled'].includes(result.status)
    const update=await sb.from('media_generation_jobs').update({status:result.status,output_url:result.outputUrl,error_message:result.errorMessage,metadata:result.metadata,completed_at:terminal?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq('id',data.jobId).eq('user_id',context.userId)
    if(update.error) throw new Error(update.error.message)
    const p=await sb.from('cinema_projects').update({status:result.status==='completed'?'completed':result.status==='failed'?'failed':'rendering',error_message:result.errorMessage,updated_at:new Date().toISOString()}).eq('id',data.projectId).eq('user_id',context.userId)
    if(p.error) throw new Error(p.error.message)
    return {jobId:data.jobId,projectId:data.projectId,...result}
  })
