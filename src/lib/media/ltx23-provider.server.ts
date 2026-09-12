type JsonObject=Record<string,unknown>
export const LTX23_MODEL='fal-ai/ltx-2.3/image-to-video'
const BASE='https://queue.fal.run/fal-ai/ltx-2.3/image-to-video'

export function ltx23ProviderDuration(seconds:number){
  const n=Math.max(1,Math.round(seconds))
  return n<=6?6:n<=8?8:10
}

function headers(){
  const key=process.env['FAL_KEY']??''
  if(!key) throw new Error('LTX generation requires FAL_KEY.')
  return {Authorization:`Key ${key}`,'Content-Type':'application/json'}
}

function parse(raw:string,label:string):JsonObject{
  let parsed:unknown
  try{parsed=JSON.parse(raw)}catch{throw new Error(`${label} returned invalid JSON.`)}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)) throw new Error(`${label} returned an invalid response.`)
  return parsed as JsonObject
}

function videoUrl(result:JsonObject){
  const video=result['video']
  return video&&typeof video==='object'&&!Array.isArray(video)&&typeof (video as JsonObject)['url']==='string'
    ? String((video as JsonObject)['url'])
    : null
}

export function hasDirectLtx23Provider(){return Boolean((process.env['FAL_KEY']??'').trim())}

export async function submitDirectLtx23(input:{prompt:string;sourceUrl:string;aspectRatio:string;durationSeconds:number}){
  const requestedDurationSeconds=Math.max(1,Math.round(input.durationSeconds))
  const providerDurationSeconds=ltx23ProviderDuration(requestedDurationSeconds)
  const response=await fetch(BASE,{
    method:'POST',
    headers:headers(),
    redirect:'manual',
    signal:AbortSignal.timeout(120_000),
    body:JSON.stringify({
      image_url:input.sourceUrl,
      prompt:input.prompt,
      duration:providerDurationSeconds,
      resolution:'1080p',
      aspect_ratio:input.aspectRatio==='9:16'?'9:16':'16:9',
      fps:25,
      generate_audio:true,
    })
  })
  const raw=await response.text()
  if(!response.ok) throw new Error(`fal LTX-2.3 rejected the job (${response.status}): ${raw.slice(0,500)}`)
  const result=parse(raw,'fal LTX-2.3')
  const requestId=typeof result['request_id']==='string'?result['request_id']:''
  if(!requestId) throw new Error('fal LTX-2.3 did not return a request id.')
  return {workerJobId:requestId,status:'queued',outputUrl:null,metadata:{model:LTX23_MODEL,requestedDurationSeconds,providerDurationSeconds}}
}

export async function getDirectLtx23(workerJobId:string){
  if(!/^[a-zA-Z0-9._:-]{1,200}$/.test(workerJobId)) throw new Error('Invalid LTX provider job id.')
  const statusResponse=await fetch(`${BASE}/requests/${encodeURIComponent(workerJobId)}/status`,{headers:headers(),redirect:'manual',signal:AbortSignal.timeout(60_000)})
  const statusRaw=await statusResponse.text()
  if(!statusResponse.ok) throw new Error(`fal LTX-2.3 status failed (${statusResponse.status}): ${statusRaw.slice(0,500)}`)
  const statusJson=parse(statusRaw,'fal LTX-2.3 status')
  const providerStatus=String(statusJson['status']??'').toUpperCase()
  if(providerStatus!=='COMPLETED'){
    const status=providerStatus==='IN_PROGRESS'?'running':providerStatus==='IN_QUEUE'?'queued':'failed'
    return {status,outputUrl:null,errorMessage:status==='failed'?providerStatus:null,metadata:{model:LTX23_MODEL,providerJobStatus:providerStatus}}
  }
  const resultResponse=await fetch(`${BASE}/requests/${encodeURIComponent(workerJobId)}`,{headers:headers(),redirect:'manual',signal:AbortSignal.timeout(60_000)})
  const resultRaw=await resultResponse.text()
  if(!resultResponse.ok) throw new Error(`fal LTX-2.3 result failed (${resultResponse.status}): ${resultRaw.slice(0,500)}`)
  const result=parse(resultRaw,'fal LTX-2.3 result')
  const outputUrl=videoUrl(result)
  if(!outputUrl) throw new Error('fal LTX-2.3 completed without a video URL.')
  return {status:'completed',outputUrl,errorMessage:null,metadata:{model:LTX23_MODEL,providerJobStatus:'COMPLETED'}}
}
