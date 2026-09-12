import { z } from 'zod'
import { ProviderError, runChat, type ChatMessage, type Provider } from '@/lib/runtime/model-gateway.server'

const characterSchema=z.object({
  id:z.string().trim().min(1).max(60),
  name:z.string().trim().min(1).max(120),
  role:z.string().trim().min(1).max(300),
  appearance:z.string().trim().min(1).max(1000),
  wardrobe:z.array(z.string().trim().min(1).max(500)).max(12),
  voice:z.string().trim().min(1).max(500),
  continuity:z.array(z.string().trim().min(1).max(500)).max(12),
})
const locationSchema=z.object({
  id:z.string().trim().min(1).max(60),
  name:z.string().trim().min(1).max(120),
  description:z.string().trim().min(1).max(1200),
  lighting:z.string().trim().min(1).max(700),
  palette:z.array(z.string().trim().min(1).max(120)).max(12),
  continuity:z.array(z.string().trim().min(1).max(500)).max(12),
})
const sceneSchema=z.object({
  id:z.string().trim().min(1).max(60),
  act:z.number().int().min(1).max(12),
  title:z.string().trim().min(1).max(160),
  estimatedDurationSeconds:z.number().int().min(15).max(1200),
  locationId:z.string().trim().min(1).max(60),
  characterIds:z.array(z.string().trim().min(1).max(60)).max(20),
  purpose:z.string().trim().min(1).max(800),
  beats:z.array(z.string().trim().min(1).max(500)).min(1).max(16),
  visualIntent:z.string().trim().min(1).max(900),
  audioIntent:z.string().trim().min(1).max(700),
})
const productionSchema=z.object({
  title:z.string().trim().min(1).max(200),
  logline:z.string().trim().min(20).max(1200),
  theme:z.string().trim().min(1).max(800),
  visualBible:z.object({
    camera:z.string().trim().min(1).max(1000),
    lensLanguage:z.string().trim().min(1).max(1000),
    lighting:z.string().trim().min(1).max(1000),
    colour:z.string().trim().min(1).max(1000),
    motion:z.string().trim().min(1).max(1000),
    texture:z.string().trim().min(1).max(1000),
  }),
  soundBible:z.object({
    dialogue:z.string().trim().min(1).max(800),
    ambience:z.string().trim().min(1).max(800),
    music:z.string().trim().min(1).max(800),
    effects:z.string().trim().min(1).max(800),
  }),
  characters:z.array(characterSchema).min(1).max(40),
  locations:z.array(locationSchema).min(1).max(50),
  scenes:z.array(sceneSchema).min(1).max(80),
  validation:z.array(z.string().trim().min(1).max(500)).min(1).max(30),
})
export type CinemaProductionManifest=z.infer<typeof productionSchema> & {generatedBy:{provider:Provider;model:string}}

const shotSchema=z.object({
  id:z.string().trim().min(1).max(80),
  durationSeconds:z.number().min(1).max(30),
  framing:z.string().trim().min(1).max(300),
  camera:z.string().trim().min(1).max(500),
  action:z.string().trim().min(1).max(900),
  dialogue:z.string().trim().max(1200),
  visualPrompt:z.string().trim().min(10).max(2000),
  negativePrompt:z.string().trim().max(1000),
  audioPrompt:z.string().trim().max(1000),
  characterIds:z.array(z.string().trim().min(1).max(60)).max(12),
  continuityNotes:z.array(z.string().trim().min(1).max(500)).max(12),
})
const shotPlanSchema=z.object({
  sceneId:z.string().trim().min(1).max(60),
  shots:z.array(shotSchema).min(1).max(40),
  validation:z.array(z.string().trim().min(1).max(500)).min(1).max(20),
})
export type CinemaShotPlan=z.infer<typeof shotPlanSchema> & {generatedBy:{provider:Provider;model:string}}

function strictJson(text:string,label:string){
  const cleaned=text.trim().replace(/^\`\`\`(?:json)?\s*/i,'').replace(/\s*\`\`\`$/i,'').trim()
  try{return JSON.parse(cleaned)}catch{throw new Error(`The AI cinema ${label} compiler returned invalid JSON.`)}
}

function normalizeProductionManifest(value:unknown){
  if(!value||typeof value!=='object'||Array.isArray(value)) return value
  const input=value as Record<string,unknown>
  const title=typeof input['title']==='string'&&input['title'].trim()?input['title'].trim():'Untitled Cinema Production'
  const visual=input['visualBible']&&typeof input['visualBible']==='object'&&!Array.isArray(input['visualBible'])?input['visualBible'] as Record<string,unknown>:{}
  const sound=input['soundBible']&&typeof input['soundBible']==='object'&&!Array.isArray(input['soundBible'])?input['soundBible'] as Record<string,unknown>:{}
  const characters=Array.isArray(input['characters'])?input['characters'].map((item,index)=>{
    if(!item||typeof item!=='object'||Array.isArray(item)) return item
    const row=item as Record<string,unknown>
    const name=typeof row['name']==='string'&&row['name'].trim()?row['name'].trim():`Character ${index+1}`
    return {
      ...row,
      role:typeof row['role']==='string'&&row['role'].trim()?row['role']:`${name} character role`,
      appearance:typeof row['appearance']==='string'&&row['appearance'].trim()?row['appearance']:`${name} appearance continuity to be preserved`,
      wardrobe:Array.isArray(row['wardrobe'])?row['wardrobe']:[],
      voice:typeof row['voice']==='string'&&row['voice'].trim()?row['voice']:`${name} consistent production voice`,
      continuity:Array.isArray(row['continuity'])?row['continuity']:[],
    }
  }):input['characters']
  const locations=Array.isArray(input['locations'])?input['locations'].map((item,index)=>{
    if(!item||typeof item!=='object'||Array.isArray(item)) return item
    const row=item as Record<string,unknown>
    const name=typeof row['name']==='string'&&row['name'].trim()?row['name'].trim():`Location ${index+1}`
    return {
      ...row,
      description:typeof row['description']==='string'&&row['description'].trim()?row['description']:`${name} production location`,
      lighting:typeof row['lighting']==='string'&&row['lighting'].trim()?row['lighting']:'Physically motivated cinematic lighting',
      palette:Array.isArray(row['palette'])?row['palette']:[],
      continuity:Array.isArray(row['continuity'])?row['continuity']:[],
    }
  }):input['locations']
  const scenes=Array.isArray(input['scenes'])?input['scenes'].map(item=>{
    if(!item||typeof item!=='object'||Array.isArray(item)) return item
    const row=item as Record<string,unknown>
    const purpose=typeof row['purpose']==='string'&&row['purpose'].trim()?row['purpose']:'Advance the approved story and character arc'
    return {
      ...row,
      characterIds:Array.isArray(row['characterIds'])?row['characterIds']:[],
      beats:Array.isArray(row['beats'])&&row['beats'].length>0?row['beats']:[purpose],
      visualIntent:typeof row['visualIntent']==='string'&&row['visualIntent'].trim()?row['visualIntent']:'Preserve the approved visual bible and scene continuity',
      audioIntent:typeof row['audioIntent']==='string'&&row['audioIntent'].trim()?row['audioIntent']:'Preserve dialogue clarity, ambience and approved sound continuity',
    }
  }):input['scenes']
  return {
    ...input,
    title,
    logline:typeof input['logline']==='string'&&input['logline'].trim().length>=20?input['logline']:`Production plan for ${title}, preserving the approved story, characters and cinematic continuity.`,
    theme:typeof input['theme']==='string'&&input['theme'].trim()?input['theme']:'Character, consequence and continuity',
    visualBible:{
      camera:typeof visual['camera']==='string'&&visual['camera'].trim()?visual['camera']:'Cinematic coverage motivated by story and performance',
      lensLanguage:typeof visual['lensLanguage']==='string'&&visual['lensLanguage'].trim()?visual['lensLanguage']:'Consistent lens language appropriate to each scene',
      lighting:typeof visual['lighting']==='string'&&visual['lighting'].trim()?visual['lighting']:'Physically motivated cinematic lighting',
      colour:typeof visual['colour']==='string'&&visual['colour'].trim()?visual['colour']:'Consistent cinematic colour palette',
      motion:typeof visual['motion']==='string'&&visual['motion'].trim()?visual['motion']:'Controlled camera movement motivated by story',
      texture:typeof visual['texture']==='string'&&visual['texture'].trim()?visual['texture']:'Cohesive cinematic image texture',
    },
    soundBible:{
      dialogue:typeof sound['dialogue']==='string'&&sound['dialogue'].trim()?sound['dialogue']:'Natural dialogue with clear production intelligibility',
      ambience:typeof sound['ambience']==='string'&&sound['ambience'].trim()?sound['ambience']:'Continuous location-specific ambience',
      music:typeof sound['music']==='string'&&sound['music'].trim()?sound['music']:'Score supports story without overpowering dialogue',
      effects:typeof sound['effects']==='string'&&sound['effects'].trim()?sound['effects']:'Physically grounded production sound effects',
    },
    characters,
    locations,
    scenes,
    validation:Array.isArray(input['validation'])&&input['validation'].length>0?input['validation']:['Blackstar normalized optional production-manifest fields before validation.'],
  }
}

export function parseCinemaProductionManifest(text:string,targetDurationMinutes:number){
  const parsed=productionSchema.safeParse(normalizeProductionManifest(strictJson(text,'production')))
  if(!parsed.success){
    const issue=parsed.error.issues[0]
    const path=issue?.path?.length?issue.path.join('.'):'manifest'
    throw new Error(`The AI cinema production compiler returned an incomplete manifest at ${path}.`)
  }
  const charIds=new Set(parsed.data.characters.map(x=>x.id))
  const locationIds=new Set(parsed.data.locations.map(x=>x.id))
  const sceneIds=new Set<string>()
  for(const scene of parsed.data.scenes){
    if(sceneIds.has(scene.id)) throw new Error('The AI cinema production compiler returned duplicate scene ids.')
    sceneIds.add(scene.id)
    if(!locationIds.has(scene.locationId)) throw new Error('The AI cinema production compiler returned an invalid scene location reference.')
    if(scene.characterIds.some(id=>!charIds.has(id))) throw new Error('The AI cinema production compiler returned an invalid scene character reference.')
  }
  const target=targetDurationMinutes*60
  const total=parsed.data.scenes.reduce((sum,scene)=>sum+scene.estimatedDurationSeconds,0)
  if(total<target*0.65||total>target*1.35) throw new Error('The AI cinema production compiler returned scene durations too far from the requested runtime.')
  return parsed.data
}

function normalizeShotPlan(value:unknown,sceneId:string){
  if(!value||typeof value!=='object'||Array.isArray(value)) return value
  const input=value as Record<string,unknown>
  const shots=Array.isArray(input['shots'])?input['shots'].map((item,index)=>{
    if(!item||typeof item!=='object'||Array.isArray(item)) return item
    const row=item as Record<string,unknown>
    const rawDuration=row['durationSeconds']
    const durationSeconds=typeof rawDuration==='number'
      ? rawDuration
      : typeof rawDuration==='string'&&rawDuration.trim()&&Number.isFinite(Number(rawDuration))
        ? Number(rawDuration)
        : rawDuration
    const action=typeof row['action']==='string'&&row['action'].trim()?row['action']:`Approved scene action for shot ${index+1}`
    const framing=typeof row['framing']==='string'&&row['framing'].trim()?row['framing']:'cinematic medium coverage'
    const camera=typeof row['camera']==='string'&&row['camera'].trim()?row['camera']:'controlled story-motivated camera'
    return {
      ...row,
      id:typeof row['id']==='string'&&row['id'].trim()?row['id']:`${sceneId}-shot-${index+1}`,
      durationSeconds,
      framing,
      camera,
      action,
      dialogue:typeof row['dialogue']==='string'?row['dialogue']:'',
      visualPrompt:typeof row['visualPrompt']==='string'&&row['visualPrompt'].trim().length>=10
        ? row['visualPrompt']
        : `${framing}; ${camera}; ${action}; preserve approved scene, character, wardrobe, location, lighting and colour continuity`,
      negativePrompt:typeof row['negativePrompt']==='string'?row['negativePrompt']:'',
      audioPrompt:typeof row['audioPrompt']==='string'?row['audioPrompt']:'',
      characterIds:Array.isArray(row['characterIds'])?row['characterIds']:[],
      continuityNotes:Array.isArray(row['continuityNotes'])?row['continuityNotes']:[],
    }
  }):input['shots']
  return {
    ...input,
    sceneId:typeof input['sceneId']==='string'&&input['sceneId'].trim()?input['sceneId']:sceneId,
    shots,
    validation:Array.isArray(input['validation'])&&input['validation'].length>0
      ? input['validation']
      : ['Blackstar normalized optional shot-plan fields before validation.'],
  }
}

export function parseCinemaShotPlan(text:string,sceneId:string,sceneDurationSeconds:number,characterIds:string[]){
  const parsed=shotPlanSchema.safeParse(normalizeShotPlan(strictJson(text,'shot'),sceneId))
  if(!parsed.success){
    const issue=parsed.error.issues[0]
    const path=issue?.path?.length?issue.path.join('.'):'shotPlan'
    throw new Error(`The AI cinema shot compiler returned an incomplete shot plan at ${path}.`)
  }
  if(parsed.data.sceneId!==sceneId) throw new Error('The AI cinema shot compiler returned the wrong scene id.')
  const allowed=new Set(characterIds)
  if(parsed.data.shots.some(shot=>shot.characterIds.some(id=>!allowed.has(id)))) throw new Error('The AI cinema shot compiler returned an invalid character reference.')
  const ids=new Set<string>()
  for(const shot of parsed.data.shots){if(ids.has(shot.id)) throw new Error('The AI cinema shot compiler returned duplicate shot ids.');ids.add(shot.id)}
  const total=parsed.data.shots.reduce((sum,shot)=>sum+shot.durationSeconds,0)
  if(total<sceneDurationSeconds*0.65||total>sceneDurationSeconds*1.35) throw new Error('The AI cinema shot compiler returned shot durations too far from the scene duration.')
  return parsed.data
}

export async function generateCinemaProductionManifest(args:{
  title:string;prompt:string;genre:string;durationMinutes:number;aspectRatio:string;quality:string;blueprint:string;provider:Provider;model:string
}):Promise<CinemaProductionManifest>{
  const system=[
    "You are Blackstar Cinema Studio's long-form production compiler.",
    "Convert an original film blueprint into a strict JSON scene graph and continuity bible.",
    "Do not imitate living filmmakers or copyrighted films; express style only through general cinematic traits.",
    "Return JSON only with keys title,logline,theme,visualBible,soundBible,characters,locations,scenes,validation.",
    "visualBible keys: camera,lensLanguage,lighting,colour,motion,texture.",
    "soundBible keys: dialogue,ambience,music,effects.",
    "characters: id,name,role,appearance,wardrobe,voice,continuity.",
    "locations: id,name,description,lighting,palette,continuity.",
    "scenes: id,act,title,estimatedDurationSeconds,locationId,characterIds,purpose,beats,visualIntent,audioIntent.",
    "Use stable short IDs. Keep all references internally consistent.",
    "Cover the full requested runtime with scenes. Do not include individual shots yet."
  ].join(' ')
  const messages:ChatMessage[]=[
    {role:'system',content:system},
    {role:'user',content:`Title: ${args.title}\nGenre: ${args.genre}\nRuntime: ${args.durationMinutes} minutes\nAspect: ${args.aspectRatio}\nQuality: ${args.quality}\nOriginal brief:\n${args.prompt}\n\nApproved film blueprint:\n${args.blueprint}`}
  ]
  const result=await runChat({provider:args.provider,model:args.model,messages,maxTokens:12000,temperature:0.15})
  if(!result.text.trim()) throw new ProviderError('The AI cinema production compiler returned an empty response.',502,true)
  return {...parseCinemaProductionManifest(result.text,args.durationMinutes),generatedBy:{provider:result.provider,model:result.model}}
}

export async function generateCinemaShotPlan(args:{
  production:CinemaProductionManifest;sceneId:string;provider:Provider;model:string
}):Promise<CinemaShotPlan>{
  const scene=args.production.scenes.find(x=>x.id===args.sceneId)
  if(!scene) throw new Error('Cinema scene not found.')
  const characters=args.production.characters.filter(x=>scene.characterIds.includes(x.id))
  const location=args.production.locations.find(x=>x.id===scene.locationId)
  const system=[
    "You are Blackstar Cinema Studio's shot compiler.",
    "Expand exactly one approved scene into a strict JSON shot plan.",
    "Return JSON only with keys sceneId,shots,validation.",
    "Each shot has id,durationSeconds,framing,camera,action,dialogue,visualPrompt,negativePrompt,audioPrompt,characterIds,continuityNotes.",
    "Keep shot durations between 1 and 30 seconds and make their total close to the approved scene duration.",
    "Visual prompts must be production-oriented and preserve the supplied character/location/wardrobe/camera/colour continuity.",
    "Do not claim any shot has already been rendered."
  ].join(' ')
  const messages:ChatMessage[]=[
    {role:'system',content:system},
    {role:'user',content:`Scene:\n${JSON.stringify(scene)}\n\nCharacters:\n${JSON.stringify(characters)}\n\nLocation:\n${JSON.stringify(location)}\n\nVisual bible:\n${JSON.stringify(args.production.visualBible)}\n\nSound bible:\n${JSON.stringify(args.production.soundBible)}`}
  ]
  const result=await runChat({provider:args.provider,model:args.model,messages,maxTokens:9000,temperature:0.1})
  if(!result.text.trim()) throw new ProviderError('The AI cinema shot compiler returned an empty response.',502,true)
  return {...parseCinemaShotPlan(result.text,scene.id,scene.estimatedDurationSeconds,scene.characterIds),generatedBy:{provider:result.provider,model:result.model}}
}
