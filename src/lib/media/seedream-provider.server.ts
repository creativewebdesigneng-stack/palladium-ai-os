type JsonObject=Record<string,unknown>

export const SEEDREAM_MODEL='fal-ai/bytedance/seedream/v4/text-to-image'
const BASE='https://queue.fal.run/fal-ai/bytedance/seedream/v4/text-to-image'

function headers(){
  const key=(process.env['FAL_KEY']??'').trim()
  if(!key) throw new Error('Seedream generation requires FAL_KEY.')
  return {Authorization:`Key ${key}`,'Content-Type':'application/json'}
}

function parse(raw:string,label:string):JsonObject{
  let parsed:unknown
  try{parsed=JSON.parse(raw)}catch{throw new Error(`${label} returned invalid JSON.`)}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)) throw new Error(`${label} returned an invalid response.`)
  return parsed as JsonObject
}

function imageUrl(result:JsonObject){
  const images=result['images']
  if(!Array.isArray(images)||!images.length) return null
  const first=images[0]
  return first&&typeof first==='object'&&!Array.isArray(first)&&typeof (first as JsonObject)['url']==='string'
    ? String((first as JsonObject)['url'])
    : null
}

export function hasDirectSeedreamProvider(){return Boolean((process.env['FAL_KEY']??'').trim())}

export async function submitDirectSeedream(input:{prompt:string;aspectRatio:string}){
  const response=await fetch(BASE,{
    method:'POST',
    headers:headers(),
    redirect:'manual',
    signal:AbortSignal.timeout(120_000),
    body:JSON.stringify({
      prompt:input.prompt,
      image_size:input.aspectRatio==='9:16'?'portrait_16_9':input.aspectRatio==='1:1'?'square_hd':'landscape_16_9',
      num_images:1,
      output_format:'png',
      enable_safety_checker:true,
    })
  })
  const raw=await response.text()
  if(!response.ok) throw new Error(`fal Seedream rejected the job (${response.status}): ${raw.slice(0,500)}`)
  const result=parse(raw,'fal Seedream')
  const requestId=typeof result['request_id']==='string'?result['request_id']:''
  if(!requestId) throw new Error('fal Seedream did not return a request id.')
  return {workerJobId:requestId,status:'queued',outputUrl:null,metadata:{model:SEEDREAM_MODEL}}
}

export async function getDirectSeedream(workerJobId:string){
  if(!/^[a-zA-Z0-9._:-]{1,200}$/.test(workerJobId)) throw new Error('Invalid Seedream provider job id.')
  const statusResponse=await fetch(`${BASE}/requests/${encodeURIComponent(workerJobId)}/status`,{
    headers:headers(),redirect:'manual',signal:AbortSignal.timeout(60_000)
  })
  const statusRaw=await statusResponse.text()
  if(!statusResponse.ok) throw new Error(`fal Seedream status failed (${statusResponse.status}): ${statusRaw.slice(0,500)}`)
  const statusJson=parse(statusRaw,'fal Seedream status')
  const providerStatus=String(statusJson['status']??'').toUpperCase()
  if(providerStatus!=='COMPLETED'){
    const status=providerStatus==='IN_PROGRESS'?'running':providerStatus==='IN_QUEUE'?'queued':'failed'
    return {status,outputUrl:null,errorMessage:status==='failed'?providerStatus:null,metadata:{model:SEEDREAM_MODEL,providerJobStatus:providerStatus}}
  }
  const resultResponse=await fetch(`${BASE}/requests/${encodeURIComponent(workerJobId)}`,{
    headers:headers(),redirect:'manual',signal:AbortSignal.timeout(60_000)
  })
  const resultRaw=await resultResponse.text()
  if(!resultResponse.ok) throw new Error(`fal Seedream result failed (${resultResponse.status}): ${resultRaw.slice(0,500)}`)
  const result=parse(resultRaw,'fal Seedream result')
  const outputUrl=imageUrl(result)
  if(!outputUrl) throw new Error('fal Seedream completed without an image URL.')
  return {status:'completed',outputUrl,errorMessage:null,metadata:{model:SEEDREAM_MODEL,providerJobStatus:'COMPLETED'}}
}
