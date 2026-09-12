import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { getGenerativeMediaCapabilities, getGenerativeMediaJob, submitGenerativeMediaJob } from '@/lib/media/generative-media.server'

type Sb={from:(table:string)=>any}

function seedreamAspect(aspect:string){
  if(aspect==='2.39:1') return '21:9'
  if(aspect==='1.85:1') return '16:9'
  return aspect
}

export function cinemaSegmentDurations(seconds:number){
  const total=Math.max(1,Math.min(30,Math.round(seconds)))
  const allowed=[10,8,5,3]
  const out:number[]=[]
  let remaining=total
  while(remaining>0){
    let pick=allowed.find(v=>v<=remaining)
    if(!pick) pick=3
    out.push(pick)
    remaining-=pick
    if(out.length>=10) break
  }
  return out
}

function shotPlan(project:any,sceneId:string){
  const production=project.production_manifest
  const scene=production?.scenes?.find((item:any)=>item.id===sceneId)
  const plan=production?.shotPlans?.[sceneId]
  if(!scene) throw new Error('Cinema scene not found.')
  if(!plan?.shots?.length) throw new Error('Compile this scene into shots before rendering.')
  return {scene,plan}
}

function completedAt(status:string){return ['completed','failed','cancelled'].includes(status)?new Date().toISOString():null}

async function createMediaJob(sb:Sb,userId:string,input:{
  provider:'seedream'|'ltx';prompt:string;aspectRatio:string;sourceUrl?:string|null;durationSeconds?:number|null;metadata:any
}){
  const kind=input.provider==='seedream'?'image':'video'
  const row=await sb.from('media_generation_jobs').insert({
    user_id:userId,provider:input.provider,kind,prompt:input.prompt,aspect_ratio:input.aspectRatio,
    source_url:input.sourceUrl??null,duration_seconds:input.provider==='ltx'?input.durationSeconds??5:null,
    status:'queued',metadata:input.metadata
  }).select('id').single()
  if(row.error) throw new Error(row.error.message)
  try{
    const worker=await submitGenerativeMediaJob({
      provider:input.provider,prompt:input.prompt,aspectRatio:input.aspectRatio,sourceUrl:input.sourceUrl??null,durationSeconds:input.durationSeconds??null
    })
    const update=await sb.from('media_generation_jobs').update({
      worker_job_id:worker.workerJobId,status:worker.status,output_url:worker.outputUrl,
      completed_at:completedAt(worker.status),updated_at:new Date().toISOString()
    }).eq('id',row.data.id).eq('user_id',userId)
    if(update.error) throw new Error(update.error.message)
    return {mediaJobId:row.data.id,...worker}
  }catch(error){
    const message=error instanceof Error?error.message:'Cinema media submission failed.'
    await sb.from('media_generation_jobs').update({status:'failed',error_message:message.slice(0,1000),completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',row.data.id).eq('user_id',userId)
    throw error
  }
}

export const getCinemaRenderOverview=createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
  .inputValidator((v:unknown)=>z.object({projectId:z.string().uuid()}).parse(v))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb
    const result=await sb.from('cinema_shot_renders')
      .select('id,cinema_project_id,scene_id,shot_id,stage,segment_index,duration_seconds,provider,media_job_id,status,output_url,error_message,metadata,created_at,updated_at,completed_at')
      .eq('cinema_project_id',data.projectId).eq('user_id',context.userId)
      .order('scene_id',{ascending:true}).order('shot_id',{ascending:true}).order('segment_index',{ascending:true})
    if(result.error) throw new Error(result.error.message)
    return {capabilities:getGenerativeMediaCapabilities(),renders:result.data??[]}
  })

export const submitCinemaSceneKeyframes=createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
  .inputValidator((v:unknown)=>z.object({projectId:z.string().uuid(),sceneId:z.string().trim().min(1).max(60),limit:z.number().int().min(1).max(8).default(6)}).parse(v))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb
    const project=await sb.from('cinema_projects').select('id,aspect_ratio,production_manifest,status').eq('id',data.projectId).eq('user_id',context.userId).maybeSingle()
    if(project.error) throw new Error(project.error.message)
    if(!project.data) throw new Error('Cinema project not found.')
    if(project.data.status!=='planned') throw new Error('Compile the Cinema production before rendering shots.')
    const {scene,plan}=shotPlan(project.data,data.sceneId)
    const existing=await sb.from('cinema_shot_renders').select('id,shot_id,status,output_url,media_job_id').eq('cinema_project_id',data.projectId).eq('scene_id',data.sceneId).eq('stage','keyframe').eq('user_id',context.userId)
    if(existing.error) throw new Error(existing.error.message)
    const existingByShot=new Map((existing.data??[]).map((row:any)=>[String(row.shot_id),row]))
    const shots=plan.shots.slice(0,data.limit)
    const results=[]
    for(const shot of shots){
      const prior:any=existingByShot.get(String(shot.id))
      if(prior&&['completed','queued','running'].includes(String(prior.status))){
        results.push({shotId:shot.id,renderId:prior.id,status:prior.status,reused:true,outputUrl:prior.output_url??null})
        continue
      }
      let mappingId:string|null=prior?.id??null
      try{
        if(mappingId){
          const reset=await sb.from('cinema_shot_renders').update({
            media_job_id:null,status:'queued',output_url:null,error_message:null,completed_at:null,updated_at:new Date().toISOString(),
            metadata:{sceneTitle:scene.title,shot,retryOfStatus:prior?.status??null}
          }).eq('id',mappingId).eq('user_id',context.userId)
          if(reset.error) throw new Error(reset.error.message)
        }else{
          const mapping=await sb.from('cinema_shot_renders').insert({
            user_id:context.userId,cinema_project_id:data.projectId,scene_id:data.sceneId,shot_id:shot.id,stage:'keyframe',segment_index:0,
            duration_seconds:null,provider:'seedream',status:'queued',metadata:{sceneTitle:scene.title,shot}
          }).select('id').single()
          if(mapping.error) throw new Error(mapping.error.message)
          mappingId=mapping.data.id
        }
        const prompt=[
          shot.visualPrompt,
          `Framing: ${shot.framing}.`,
          `Camera: ${shot.camera}.`,
          `Continuity: ${(shot.continuityNotes??[]).join('; ')}.`,
          `Scene intent: ${scene.visualIntent}.`,
          'Create a single high-quality cinematic reference frame for this exact shot. Preserve character identity, wardrobe, location geometry, lighting direction, palette and prop state. No text, captions, watermark or logo.'
        ].join(' ')
        const media=await createMediaJob(sb,context.userId,{provider:'seedream',prompt,aspectRatio:seedreamAspect(project.data.aspect_ratio),metadata:{cinemaProjectId:data.projectId,sceneId:data.sceneId,shotId:shot.id,stage:'keyframe'}})
        const update=await sb.from('cinema_shot_renders').update({
          media_job_id:media.mediaJobId,status:media.status,output_url:media.outputUrl,completed_at:completedAt(media.status),updated_at:new Date().toISOString()
        }).eq('id',mappingId).eq('user_id',context.userId)
        if(update.error) throw new Error(update.error.message)
        results.push({shotId:shot.id,renderId:mappingId,status:media.status})
      }catch(error){
        const message=error instanceof Error?error.message:'Cinema keyframe submission failed.'
        if(mappingId) await sb.from('cinema_shot_renders').update({status:'failed',error_message:message.slice(0,1000),completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',mappingId).eq('user_id',context.userId)
        results.push({shotId:shot.id,renderId:mappingId,status:'failed',error:message})
      }
    }
    return {projectId:data.projectId,sceneId:data.sceneId,results}
  })

export const submitCinemaSceneVideoSegments=createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
  .inputValidator((v:unknown)=>z.object({projectId:z.string().uuid(),sceneId:z.string().trim().min(1).max(60),limitShots:z.number().int().min(1).max(6).default(3)}).parse(v))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb
    const project=await sb.from('cinema_projects').select('id,aspect_ratio,production_manifest,status').eq('id',data.projectId).eq('user_id',context.userId).maybeSingle()
    if(project.error) throw new Error(project.error.message)
    if(!project.data) throw new Error('Cinema project not found.')
    if(project.data.status!=='planned') throw new Error('Compile the Cinema production before rendering shots.')
    const {scene,plan}=shotPlan(project.data,data.sceneId)
    const existing=await sb.from('cinema_shot_renders').select('id,shot_id,stage,segment_index,status,output_url,media_job_id').eq('cinema_project_id',data.projectId).eq('scene_id',data.sceneId).eq('user_id',context.userId)
    if(existing.error) throw new Error(existing.error.message)
    const videoByKey=new Map((existing.data??[]).filter((row:any)=>row.stage==='video').map((row:any)=>[`${row.shot_id}:${row.segment_index}`,row]))
    const keyframes=await sb.from('cinema_shot_renders').select('shot_id,status,output_url').eq('cinema_project_id',data.projectId).eq('scene_id',data.sceneId).eq('stage','keyframe').eq('user_id',context.userId)
    if(keyframes.error) throw new Error(keyframes.error.message)
    const keyframeByShot=new Map((keyframes.data??[]).filter((row:any)=>row.status==='completed'&&row.output_url).map((row:any)=>[String(row.shot_id),String(row.output_url)]))
    const eligible=plan.shots.filter((shot:any)=>keyframeByShot.has(String(shot.id))).slice(0,data.limitShots)
    if(!eligible.length) throw new Error('Complete Cinema keyframes before submitting video segments.')
    const results=[]
    for(const shot of eligible){
      const durations=cinemaSegmentDurations(Number(shot.durationSeconds))
      for(let segmentIndex=0;segmentIndex<durations.length;segmentIndex++){
        const key=`${shot.id}:${segmentIndex}`
        const prior:any=videoByKey.get(key)
        if(prior&&['completed','queued','running'].includes(String(prior.status))){
          results.push({shotId:shot.id,segmentIndex,renderId:prior.id,status:prior.status,reused:true,outputUrl:prior.output_url??null})
          continue
        }
        let mappingId:string|null=prior?.id??null
        try{
          const seconds=durations[segmentIndex]!
          if(mappingId){
            const reset=await sb.from('cinema_shot_renders').update({
              media_job_id:null,status:'queued',output_url:null,error_message:null,completed_at:null,updated_at:new Date().toISOString(),
              metadata:{sceneTitle:scene.title,shot,segmentIndex,segmentCount:durations.length,retryOfStatus:prior?.status??null}
            }).eq('id',mappingId).eq('user_id',context.userId)
            if(reset.error) throw new Error(reset.error.message)
          }else{
            const mapping=await sb.from('cinema_shot_renders').insert({
              user_id:context.userId,cinema_project_id:data.projectId,scene_id:data.sceneId,shot_id:shot.id,stage:'video',segment_index:segmentIndex,
              duration_seconds:seconds,provider:'ltx',status:'queued',metadata:{sceneTitle:scene.title,shot,segmentIndex,segmentCount:durations.length}
            }).select('id').single()
            if(mapping.error) throw new Error(mapping.error.message)
            mappingId=mapping.data.id
          }
          const prompt=[
            shot.visualPrompt,
            `Action: ${shot.action}.`,
            `Camera: ${shot.camera}.`,
            shot.dialogue?`Dialogue intent: ${shot.dialogue}.`:'',
            shot.audioPrompt?`Audio intent: ${shot.audioPrompt}.`:'',
            `This is segment ${segmentIndex+1} of ${durations.length} for the same shot. Preserve the supplied source-frame identity, composition, wardrobe, location, lighting and prop continuity. Maintain natural temporal motion and avoid cuts inside this segment.`
          ].filter(Boolean).join(' ')
          const projectAspect=String(project.data.aspect_ratio)
          const keyframeUrl=String(keyframeByShot.get(String(shot.id)) ?? '')
          const media=await createMediaJob(sb,context.userId,{provider:'ltx',prompt,aspectRatio:projectAspect==='2.39:1'||projectAspect==='1.85:1'?'16:9':projectAspect,sourceUrl:keyframeUrl,durationSeconds:seconds,metadata:{cinemaProjectId:data.projectId,sceneId:data.sceneId,shotId:shot.id,stage:'video',segmentIndex}})
          const update=await sb.from('cinema_shot_renders').update({media_job_id:media.mediaJobId,status:media.status,output_url:media.outputUrl,completed_at:completedAt(media.status),updated_at:new Date().toISOString()}).eq('id',mappingId).eq('user_id',context.userId)
          if(update.error) throw new Error(update.error.message)
          results.push({shotId:shot.id,segmentIndex,renderId:mappingId,status:media.status})
        }catch(error){
          const message=error instanceof Error?error.message:'Cinema video submission failed.'
          if(mappingId) await sb.from('cinema_shot_renders').update({status:'failed',error_message:message.slice(0,1000),completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',mappingId).eq('user_id',context.userId)
          results.push({shotId:shot.id,segmentIndex,renderId:mappingId,status:'failed',error:message})
        }
      }
    }
    return {projectId:data.projectId,sceneId:data.sceneId,results}
  })

export const refreshCinemaShotRender=createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
  .inputValidator((v:unknown)=>z.object({id:z.string().uuid()}).parse(v))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb
    const render=await sb.from('cinema_shot_renders').select('id,provider,media_job_id').eq('id',data.id).eq('user_id',context.userId).maybeSingle()
    if(render.error) throw new Error(render.error.message)
    if(!render.data) throw new Error('Cinema shot render not found.')
    if(!render.data.media_job_id) throw new Error('Cinema shot render has no accepted media job.')
    const media=await sb.from('media_generation_jobs').select('id,worker_job_id').eq('id',render.data.media_job_id).eq('user_id',context.userId).maybeSingle()
    if(media.error) throw new Error(media.error.message)
    if(!media.data?.worker_job_id) throw new Error('Cinema media job has no worker id.')
    const provider=z.enum(['seedream','ltx']).parse(render.data.provider)
    const result=await getGenerativeMediaJob(provider,media.data.worker_job_id)
    const mediaUpdate=await sb.from('media_generation_jobs').update({status:result.status,output_url:result.outputUrl,error_message:result.errorMessage,metadata:result.metadata,completed_at:completedAt(result.status),updated_at:new Date().toISOString()}).eq('id',media.data.id).eq('user_id',context.userId)
    if(mediaUpdate.error) throw new Error(mediaUpdate.error.message)
    const renderUpdate=await sb.from('cinema_shot_renders').update({status:result.status,output_url:result.outputUrl,error_message:result.errorMessage,metadata:result.metadata,completed_at:completedAt(result.status),updated_at:new Date().toISOString()}).eq('id',data.id).eq('user_id',context.userId)
    if(renderUpdate.error) throw new Error(renderUpdate.error.message)
    return {id:data.id,...result}
  })
