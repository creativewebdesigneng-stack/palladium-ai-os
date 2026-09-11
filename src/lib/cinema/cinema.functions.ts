import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { resolveAssistantModelPreference } from '@/lib/ai/ai-preferences.server'
import { runChat, type ChatMessage } from '@/lib/runtime/model-gateway.server'
import { getCinemaCapabilities, submitCinemaRender } from './cinema-runtime.server'
import { generateCinemaProductionManifest, generateCinemaShotPlan } from './cinema-production.server'

type Sb={from:(table:string)=>any}

export const getCinemaStudioOverview=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const sb=context.supabase as unknown as Sb
  const [jobs,projects]=await Promise.all([
    sb.from('media_generation_jobs').select('id,provider,kind,prompt,aspect_ratio,duration_seconds,status,worker_job_id,output_url,error_message,metadata,created_at,updated_at,completed_at').eq('user_id',context.userId).eq('provider','cinema').order('created_at',{ascending:false}).limit(50),
    sb.from('cinema_projects').select('id,title,prompt,genre,target_duration_minutes,aspect_ratio,quality,status,blueprint,production_manifest,continuity_bible,error_message,created_at,updated_at').eq('user_id',context.userId).order('created_at',{ascending:false}).limit(50)
  ])
  if(jobs.error) throw new Error(jobs.error.message)
  if(projects.error) throw new Error(projects.error.message)
  return {capabilities:getCinemaCapabilities(),jobs:jobs.data ?? [],projects:projects.data ?? []}
})

export const planCinemaFilm=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({
  prompt:z.string().trim().min(10).max(8000),durationMinutes:z.number().int().min(1).max(180),genre:z.string().trim().min(2).max(120),rating:z.string().trim().max(40).default('general audience'),
  title:z.string().trim().min(1).max(200).default('Untitled Film'),aspectRatio:z.enum(['16:9','2.39:1','1.85:1','9:16','1:1']).default('2.39:1'),quality:z.enum(['preview','production','cinema']).default('cinema')
}).parse(v)).handler(async({data,context})=>{
  const sb=context.supabase as unknown as Sb
  const pref=await sb.from('user_ai_preferences').select('default_provider,default_model').eq('user_id',context.userId).maybeSingle()
  const {provider,model}=resolveAssistantModelPreference(pref.error?null:pref.data)
  const messages:ChatMessage[]=[
    {role:'system',content:'You are Blackstar Cinema Studio, a film development system. Create an original production blueprint from the brief. Return structured plain text with TITLE, LOGLINE, CHARACTERS, ACTS, SCENES, VISUAL BIBLE, SOUND, and CONTINUITY. For every scene include estimated duration, location, characters, story purpose and a compact shot plan. Keep the total scene durations close to the requested runtime. Do not imitate a living filmmaker or copyrighted film; translate style requests into general cinematic traits.'},
    {role:'user',content:`Brief: ${data.prompt}\nGenre: ${data.genre}\nTarget runtime: ${data.durationMinutes} minutes\nRating: ${data.rating}`}
  ]
  const maxTokens=Math.min(12000,Math.max(2500,data.durationMinutes*60))
  const result=await runChat({provider,model,messages,maxTokens})
  if(!result.text.trim()) throw new Error('Cinema planner returned an empty blueprint.')
  const blueprint=result.text.trim()
  const created=await sb.from('cinema_projects').insert({
    user_id:context.userId,title:data.title,prompt:data.prompt,genre:data.genre,target_duration_minutes:data.durationMinutes,
    aspect_ratio:data.aspectRatio,quality:data.quality,status:'draft',blueprint,production_manifest:{},continuity_bible:{}
  }).select('id').single()
  if(created.error) throw new Error(created.error.message)
  return {id:created.data.id,blueprint,provider:result.provider,model:result.model}
})

export const createCinemaFilm=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({
 title:z.string().trim().min(1).max(200),prompt:z.string().trim().min(10).max(8000),screenplay:z.string().trim().min(100).max(200000),
 durationMinutes:z.number().int().min(1).max(180),aspectRatio:z.enum(['16:9','2.39:1','1.85:1','9:16','1:1']),quality:z.enum(['preview','production','cinema']),
 references:z.array(z.string().url().max(4000)).max(40).default([])
}).parse(v)).handler(async({data,context})=>{
 const sb=context.supabase as unknown as Sb
 const inserted=await sb.from('media_generation_jobs').insert({user_id:context.userId,provider:'cinema',kind:'video',prompt:data.prompt,aspect_ratio:data.aspectRatio,duration_seconds:data.durationMinutes*60,status:'queued',metadata:{title:data.title,quality:data.quality,references:data.references,screenplay:data.screenplay}}).select('id').single()
 if(inserted.error) throw new Error(inserted.error.message)
 try{
  const result=await submitCinemaRender(data)
  const u=await sb.from('media_generation_jobs').update({worker_job_id:result.workerJobId,status:result.status,output_url:result.outputUrl,updated_at:new Date().toISOString()}).eq('id',inserted.data.id).eq('user_id',context.userId)
  if(u.error) throw new Error(u.error.message)
  return {id:inserted.data.id,...result}
 }catch(error){
  const message=error instanceof Error?error.message:'Cinema render failed'
  await sb.from('media_generation_jobs').update({status:'failed',error_message:message.slice(0,1000),completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',inserted.data.id).eq('user_id',context.userId)
  throw error
 }
})


export const compileCinemaProduction=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((v:unknown)=>z.object({id:z.string().uuid()}).parse(v))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb
    const claimed=await sb.from('cinema_projects').update({status:'planning',error_message:null,updated_at:new Date().toISOString()})
      .eq('id',data.id).eq('user_id',context.userId).in('status',['draft','failed'])
      .select('id,title,prompt,genre,target_duration_minutes,aspect_ratio,quality,blueprint').maybeSingle()
    if(claimed.error) throw new Error(claimed.error.message)
    if(!claimed.data) throw new Error('Cinema project is not ready for production compilation.')
    if(!claimed.data.blueprint) throw new Error('Develop the film blueprint before compiling production.')
    const pref=await sb.from('user_ai_preferences').select('default_provider,default_model').eq('user_id',context.userId).maybeSingle()
    const {provider,model}=resolveAssistantModelPreference(pref.error?null:pref.data)
    try{
      const manifest=await generateCinemaProductionManifest({
        title:claimed.data.title,prompt:claimed.data.prompt,genre:claimed.data.genre,durationMinutes:claimed.data.target_duration_minutes,
        aspectRatio:claimed.data.aspect_ratio,quality:claimed.data.quality,blueprint:claimed.data.blueprint,provider,model
      })
      const continuity={visualBible:manifest.visualBible,soundBible:manifest.soundBible,characters:manifest.characters,locations:manifest.locations}
      const saved=await sb.from('cinema_projects').update({
        status:'planned',production_manifest:{...manifest,shotPlans:{}},continuity_bible:continuity,error_message:null,updated_at:new Date().toISOString()
      }).eq('id',data.id).eq('user_id',context.userId).eq('status','planning')
        .select('id,status,production_manifest,continuity_bible').maybeSingle()
      if(saved.error) throw new Error(saved.error.message)
      if(!saved.data) throw new Error('Cinema production compilation was interrupted before it could be saved.')
      return saved.data
    }catch(error){
      const message=error instanceof Error?error.message:'Cinema production compilation failed.'
      await sb.from('cinema_projects').update({status:'failed',error_message:message.slice(0,1000),updated_at:new Date().toISOString()}).eq('id',data.id).eq('user_id',context.userId).eq('status','planning')
      throw error
    }
  })

export const compileCinemaSceneShots=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((v:unknown)=>z.object({id:z.string().uuid(),sceneId:z.string().trim().min(1).max(60)}).parse(v))
  .handler(async({data,context})=>{
    const sb=context.supabase as unknown as Sb
    const project=await sb.from('cinema_projects').select('id,status,production_manifest').eq('id',data.id).eq('user_id',context.userId).maybeSingle()
    if(project.error) throw new Error(project.error.message)
    if(!project.data) throw new Error('Cinema project not found.')
    if(project.data.status!=='planned') throw new Error('Compile the cinema production manifest before expanding shots.')
    const production=project.data.production_manifest
    if(!production||typeof production!=='object'||!Array.isArray(production.scenes)) throw new Error('Cinema production manifest is missing.')
    const pref=await sb.from('user_ai_preferences').select('default_provider,default_model').eq('user_id',context.userId).maybeSingle()
    const {provider,model}=resolveAssistantModelPreference(pref.error?null:pref.data)
    const shotPlan=await generateCinemaShotPlan({production,sceneId:data.sceneId,provider,model})
    const shotPlans=production.shotPlans&&typeof production.shotPlans==='object'&&!Array.isArray(production.shotPlans)?production.shotPlans:{}
    const next={...production,shotPlans:{...shotPlans,[data.sceneId]:shotPlan}}
    const saved=await sb.from('cinema_projects').update({production_manifest:next,updated_at:new Date().toISOString()})
      .eq('id',data.id).eq('user_id',context.userId).select('id,production_manifest').maybeSingle()
    if(saved.error) throw new Error(saved.error.message)
    if(!saved.data) throw new Error('Cinema shot plan could not be saved.')
    return {id:data.id,sceneId:data.sceneId,shotPlan}
  })
