export type CinemaQuality = 'preview' | 'production' | 'cinema'
export type CinemaAspect = '16:9' | '2.39:1' | '1.85:1' | '9:16' | '1:1'

export const CINEMA_MAX_DURATION_MINUTES = 180
export const BLACKSTAR_CINEMA_MASTER_WORKER_URL = 'https://blackstar-auto-editor-worker-0kjxvk.v2.appdeploy.ai'

export function getCinemaCapabilities() {
  const renderUrl = (process.env['CINEMA_STUDIO_WORKER_URL'] ?? '').trim()
  const configuredMasterUrl = (process.env['CINEMA_STUDIO_MASTER_WORKER_URL'] ?? '').trim()
  const masterUrl = configuredMasterUrl || renderUrl || BLACKSTAR_CINEMA_MASTER_WORKER_URL
  return {
    configured: Boolean(masterUrl),
    renderConfigured: Boolean(renderUrl),
    masterConfigured: Boolean(masterUrl),
    masterProvider: configuredMasterUrl
      ? 'configured-master-worker'
      : renderUrl
        ? 'configured-cinema-worker'
        : 'blackstar-hosted-master',
    maxDurationMinutes: CINEMA_MAX_DURATION_MINUTES,
    workflow: 'blackstar-cinema-studio',
    stages: ['treatment','screenplay','shot-plan','visual-generation','voice','music','assembly','master'],
    aspects: ['16:9','2.39:1','1.85:1','9:16','1:1'] as CinemaAspect[],
    qualities: ['preview','production','cinema'] as CinemaQuality[],
    continuity: ['character','wardrobe','location','prop','camera','colour'],
    outputs: ['mp4','mov'],
    note: renderUrl
      ? 'Long-form cinema jobs may use the configured Cinema renderer; completed shot segments can be assembled by the configured or Blackstar-hosted master worker.'
      : 'Planning, shot rendering through the configured image/video providers, and final assembly of completed shot segments are available. Direct one-shot text-to-film rendering remains disabled until CINEMA_STUDIO_WORKER_URL is configured.',
  }
}

function publicUrl(value: string) {
  const u = new URL(value)
  if (!['http:','https:'].includes(u.protocol)) throw new Error('Reference URL must use HTTP or HTTPS.')
  const h=u.hostname.toLowerCase()
  if(h==='localhost'||h==='127.0.0.1'||h==='::1'||h.endsWith('.local')||/^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) throw new Error('Private/local reference URLs are not accepted.')
  return u.toString()
}

function base() { return (process.env['CINEMA_STUDIO_WORKER_URL'] ?? '').trim().replace(/\/+$/,'') }
function masterBase() { return ((process.env['CINEMA_STUDIO_MASTER_WORKER_URL'] ?? '').trim() || base() || BLACKSTAR_CINEMA_MASTER_WORKER_URL).replace(/\/+$/,'') }
function token() { return (process.env['CINEMA_STUDIO_WORKER_TOKEN'] ?? '').trim() }
function headers() { return token() ? {'content-type':'application/json',authorization:`Bearer ${token()}`} : {'content-type':'application/json'} }

export async function submitCinemaRender(input: {
  title:string; prompt:string; screenplay:string; durationMinutes:number; aspectRatio:CinemaAspect; quality:CinemaQuality;
  references?:string[]; seed?:number|null
}) {
  const url=base()
  if(!url) throw new Error('Cinema rendering requires CINEMA_STUDIO_WORKER_URL.')
  const references=(input.references ?? []).map(publicUrl)
  const response=await fetch(`${url}/v1/films`,{method:'POST',headers:headers(),redirect:'manual',signal:AbortSignal.timeout(120_000),body:JSON.stringify({
    workflow:'blackstar-cinema-studio', title:input.title, prompt:input.prompt, screenplay:input.screenplay,
    duration_minutes:input.durationMinutes, aspect_ratio:input.aspectRatio, quality:input.quality, references, seed:input.seed ?? null,
    pipeline:{scene_graph:true,shot_graph:true,character_continuity:true,visual_generation:true,voice:true,music:true,sfx:true,colour_grade:true,final_master:true}
  })})
  const raw=await response.text()
  if(!response.ok) throw new Error(`Cinema worker rejected render (${response.status}): ${raw.slice(0,400)}`)
  const json=JSON.parse(raw)
  const id=String(json.id ?? json.job_id ?? '').trim()
  if(!id) throw new Error('Cinema worker did not return a job id.')
  return {workerJobId:id,status:String(json.status ?? 'queued'),outputUrl:typeof json.output_url==='string'?json.output_url:null}
}

export async function getCinemaRender(id:string) {
  if(!/^[a-zA-Z0-9._:-]{1,180}$/.test(id)) throw new Error('Invalid cinema worker job id.')
  const url=base()
  if(!url) throw new Error('Cinema rendering requires CINEMA_STUDIO_WORKER_URL.')
  const response=await fetch(`${url}/v1/films/${encodeURIComponent(id)}`,{headers:headers(),redirect:'manual',signal:AbortSignal.timeout(60_000)})
  const raw=await response.text()
  if(!response.ok) throw new Error(`Cinema worker status failed (${response.status}): ${raw.slice(0,400)}`)
  const json=JSON.parse(raw)
  return {status:String(json.status ?? 'queued'),outputUrl:typeof json.output_url==='string'?json.output_url:null,errorMessage:typeof json.error==='string'?json.error.slice(0,1000):null,metadata:{stage:json.stage ?? null,progress:json.progress ?? null}}
}

export async function submitCinemaMasterAssembly(input:{
  projectId:string;
  title:string;
  aspectRatio:CinemaAspect;
  quality:CinemaQuality;
  manifest:unknown;
}) {
  const url=masterBase()
  const response=await fetch(`${url}/v1/films/assemble`,{
    method:'POST',
    headers:headers(),
    redirect:'manual',
    signal:AbortSignal.timeout(120_000),
    body:JSON.stringify({
      workflow:'blackstar-cinema-master-assembly',
      project_id:input.projectId,
      title:input.title,
      aspect_ratio:input.aspectRatio,
      quality:input.quality,
      manifest:input.manifest,
    })
  })
  const raw=await response.text()
  if(!response.ok) throw new Error(`Cinema master worker rejected assembly (${response.status}): ${raw.slice(0,400)}`)
  let json:any
  try{json=JSON.parse(raw)}catch{throw new Error('Cinema master worker returned invalid JSON.')}
  const id=String(json.id??json.job_id??'').trim()
  if(!id) throw new Error('Cinema master worker did not return a job id.')
  return {workerJobId:id,status:String(json.status??'queued'),outputUrl:typeof json.output_url==='string'?json.output_url:null}
}
