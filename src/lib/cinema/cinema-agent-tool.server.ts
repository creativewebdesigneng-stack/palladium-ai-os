import type { ToolDef, ChatMessage } from '@/lib/runtime/model-gateway.server'
import { runChat } from '@/lib/runtime/model-gateway.server'
import { resolveAssistantModelPreference } from '@/lib/ai/ai-preferences.server'
import { getCinemaCapabilities } from './cinema-runtime.server'
import { generateCinemaProductionManifest, generateCinemaShotPlan } from './cinema-production.server'
import { buildCinemaAssemblyManifest } from './cinema-master.functions'

type ToolContext={userId:string;sb:{from:(table:string)=>any}}

export const CINEMA_STUDIO_TOOL_DEF:ToolDef={
  name:'cinema_studio',
  description:'Develop and inspect Blackstar Cinema Studio projects, compile long-form scene/shot plans, and audit master readiness. It never claims unrendered footage or a finished feature film exists.',
  parameters:{type:'object',properties:{
    action:{type:'string',enum:['capabilities','list_projects','develop_project','compile_production','compile_scene','audit_master']},
    project_id:{type:'string'},
    scene_id:{type:'string'},
    title:{type:'string',maxLength:200},
    prompt:{type:'string',maxLength:8000},
    genre:{type:'string',maxLength:120},
    duration_minutes:{type:'number'},
    aspect_ratio:{type:'string',enum:['16:9','2.39:1','1.85:1','9:16','1:1']},
    quality:{type:'string',enum:['preview','production','cinema']},
  },required:['action']}
}

function text(input:Record<string,unknown>,key:string,max:number){return typeof input[key]==='string'?String(input[key]).trim().slice(0,max):''}

async function preference(ctx:ToolContext){
  const result=await ctx.sb.from('user_ai_preferences').select('default_provider,default_model').eq('user_id',ctx.userId).maybeSingle()
  return resolveAssistantModelPreference(result.error?null:result.data)
}

export async function runCinemaStudioTool(input:Record<string,unknown>,ctx:ToolContext){
  const action=text(input,'action',40)
  if(action==='capabilities') return getCinemaCapabilities()
  if(action==='list_projects'){
    const result=await ctx.sb.from('cinema_projects').select('id,title,genre,target_duration_minutes,aspect_ratio,quality,status,error_message,created_at,updated_at').eq('user_id',ctx.userId).order('created_at',{ascending:false}).limit(25)
    if(result.error) throw new Error(result.error.message)
    return {projects:result.data??[]}
  }
  if(action==='develop_project'){
    const title=text(input,'title',200)||'Untitled Film'
    const prompt=text(input,'prompt',8000)
    const genre=text(input,'genre',120)||'cinematic drama'
    const duration=Math.max(1,Math.min(180,Math.round(Number(input['duration_minutes']??120))))
    const aspect=['16:9','2.39:1','1.85:1','9:16','1:1'].includes(String(input['aspect_ratio']))?String(input['aspect_ratio']):'2.39:1'
    const quality=['preview','production','cinema'].includes(String(input['quality']))?String(input['quality']):'cinema'
    if(prompt.length<10) throw new Error('develop_project requires a film prompt.')
    const {provider,model}=await preference(ctx)
    const messages:ChatMessage[]=[
      {role:'system',content:'You are Blackstar Cinema Studio. Develop an original production blueprint with TITLE, LOGLINE, CHARACTERS, ACTS, SCENES, VISUAL BIBLE, SOUND, and CONTINUITY. Include estimated scene durations, locations, characters, story purpose and compact shot intentions. Keep total duration near the requested runtime. Do not imitate a living filmmaker or copyrighted film.'},
      {role:'user',content:`Title: ${title}\nBrief: ${prompt}\nGenre: ${genre}\nTarget runtime: ${duration} minutes\nAspect: ${aspect}\nQuality: ${quality}`}
    ]
    const result=await runChat({provider,model,messages,maxTokens:Math.min(12000,Math.max(2500,duration*60))})
    if(!result.text.trim()) throw new Error('Cinema planner returned an empty blueprint.')
    const created=await ctx.sb.from('cinema_projects').insert({user_id:ctx.userId,title,prompt,genre,target_duration_minutes:duration,aspect_ratio:aspect,quality,status:'draft',blueprint:result.text.trim(),production_manifest:{},continuity_bible:{}}).select('id,title,status').single()
    if(created.error) throw new Error(created.error.message)
    return {...created.data,provider:result.provider,model:result.model}
  }
  if(action==='compile_production'){
    const projectId=text(input,'project_id',60)
    if(!projectId) throw new Error('compile_production requires project_id.')
    const project=await ctx.sb.from('cinema_projects').select('id,title,prompt,genre,target_duration_minutes,aspect_ratio,quality,blueprint,status').eq('id',projectId).eq('user_id',ctx.userId).maybeSingle()
    if(project.error) throw new Error(project.error.message)
    if(!project.data?.blueprint) throw new Error('Cinema project is missing its blueprint.')
    const {provider,model}=await preference(ctx)
    const manifest=await generateCinemaProductionManifest({title:project.data.title,prompt:project.data.prompt,genre:project.data.genre,durationMinutes:project.data.target_duration_minutes,aspectRatio:project.data.aspect_ratio,quality:project.data.quality,blueprint:project.data.blueprint,provider,model})
    const continuity={visualBible:manifest.visualBible,soundBible:manifest.soundBible,characters:manifest.characters,locations:manifest.locations}
    const update=await ctx.sb.from('cinema_projects').update({status:'planned',production_manifest:{...manifest,shotPlans:{}},continuity_bible:continuity,error_message:null,updated_at:new Date().toISOString()}).eq('id',projectId).eq('user_id',ctx.userId)
    if(update.error) throw new Error(update.error.message)
    return {projectId,status:'planned',scenes:manifest.scenes.length,characters:manifest.characters.length,locations:manifest.locations.length}
  }
  if(action==='compile_scene'){
    const projectId=text(input,'project_id',60),sceneId=text(input,'scene_id',60)
    if(!projectId||!sceneId) throw new Error('compile_scene requires project_id and scene_id.')
    const project=await ctx.sb.from('cinema_projects').select('id,status,production_manifest').eq('id',projectId).eq('user_id',ctx.userId).maybeSingle()
    if(project.error) throw new Error(project.error.message)
    if(!project.data||project.data.status!=='planned') throw new Error('Compile the Cinema production manifest first.')
    const {provider,model}=await preference(ctx)
    const shotPlan=await generateCinemaShotPlan({production:project.data.production_manifest,sceneId,provider,model})
    const production=project.data.production_manifest
    const shotPlans=production.shotPlans&&typeof production.shotPlans==='object'&&!Array.isArray(production.shotPlans)?production.shotPlans:{}
    const update=await ctx.sb.from('cinema_projects').update({production_manifest:{...production,shotPlans:{...shotPlans,[sceneId]:shotPlan}},updated_at:new Date().toISOString()}).eq('id',projectId).eq('user_id',ctx.userId)
    if(update.error) throw new Error(update.error.message)
    return {projectId,sceneId,shots:shotPlan.shots.length}
  }
  if(action==='audit_master'){
    const projectId=text(input,'project_id',60)
    if(!projectId) throw new Error('audit_master requires project_id.')
    const [project,renders]=await Promise.all([
      ctx.sb.from('cinema_projects').select('id,title,target_duration_minutes,aspect_ratio,quality,status,production_manifest').eq('id',projectId).eq('user_id',ctx.userId).maybeSingle(),
      ctx.sb.from('cinema_shot_renders').select('scene_id,shot_id,stage,segment_index,duration_seconds,status,output_url').eq('cinema_project_id',projectId).eq('user_id',ctx.userId).order('created_at',{ascending:true})
    ])
    if(project.error) throw new Error(project.error.message)
    if(renders.error) throw new Error(renders.error.message)
    if(!project.data) throw new Error('Cinema project not found.')
    return {projectId,...buildCinemaAssemblyManifest(project.data,renders.data??[])}
  }
  throw new Error('Unsupported Cinema Studio action.')
}
