import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { resolveAssistantModelPreference } from '@/lib/ai/ai-preferences.server'
import { runChat, type ChatMessage } from '@/lib/runtime/model-gateway.server'
import { getCinemaCapabilities, submitCinemaRender } from './cinema-runtime.server'

type Sb={from:(table:string)=>any}

export const getCinemaStudioOverview=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const sb=context.supabase as unknown as Sb
  const result=await sb.from('media_generation_jobs').select('id,provider,kind,prompt,aspect_ratio,duration_seconds,status,worker_job_id,output_url,error_message,metadata,created_at,updated_at,completed_at').eq('user_id',context.userId).eq('provider','cinema').order('created_at',{ascending:false}).limit(50)
  if(result.error) throw new Error(result.error.message)
  return {capabilities:getCinemaCapabilities(),jobs:result.data ?? []}
})

export const planCinemaFilm=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({
  prompt:z.string().trim().min(10).max(8000),durationMinutes:z.number().int().min(1).max(180),genre:z.string().trim().min(2).max(120),rating:z.string().trim().max(40).default('general audience')
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
  return {blueprint:result.text.trim(),provider:result.provider,model:result.model}
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
