// No-credit open-source model lane. Uses Blackstar's existing three_d_jobs lifecycle,
// but never calls FAL or charges another inference provider.
export const OPEN3D_MODELS = ['shap-e', 'triposr', 'trellis'] as const;
export type Open3dModel = (typeof OPEN3D_MODELS)[number];
export type AssetModelChoice = 'auto' | Open3dModel | 'fal';
export type Open3dProvider = 'open3d-shap-e' | 'open3d-triposr' | 'open3d-trellis';
type Kind = 'prompt' | 'image' | 'model';
const host = () => (process.env['GAME_FOUNDRY_OPEN3D_URL'] || '').trim().replace(/\/+$/, '');
const key = () => (process.env['GAME_FOUNDRY_OPEN3D_TOKEN'] || '').trim();
export function isOpen3dConfigured() { return Boolean(host() && key()); }
export function modelSupportsSource(model: Open3dModel, source: Kind) {
  return source !== 'model' && (model !== 'triposr' || source === 'image');
}
const provider = (model: Open3dModel): Open3dProvider => `open3d-${model}` as Open3dProvider;

function endpoint() {
  const base = host();
  if (!isOpen3dConfigured()) throw new Error('No free 3D worker is configured. Connect a self-hosted Shap-E/TripoSR/TRELLIS worker to generate without FAL credits.');
  const url = new URL(base);
  if (url.protocol !== 'https:' && !(process.env['NODE_ENV'] !== 'production' && url.hostname === '127.0.0.1' && url.protocol === 'http:')) {
    throw new Error('The free 3D worker must use HTTPS in production.');
  }
  if (url.username || url.password || url.search || url.hash) throw new Error('Invalid free 3D worker URL.');
  return base;
}
async function callOpen3d(path: string, method: 'GET' | 'POST', payload?: object) {
  const response = await fetch(`${endpoint()}${path}`,{
    method, headers: { Authorization: `Bearer ${key()}`, ...(payload ? {'Content-Type':'application/json'} : {}) },
    ...(payload ? {body:JSON.stringify(payload)}:{}),
    signal:AbortSignal.timeout(25000), redirect:'manual',
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error('Free 3D worker authentication or model access failed. Check the self-hosted worker token.');
    if (response.status === 409 || response.status === 503) throw new Error('The selected free 3D model is not installed, ready, or has insufficient GPU memory on the worker.');
    if (response.status === 429) throw new Error('The free 3D worker is at capacity. Retry after another job finishes.');
    if (response.status === 422 || response.status === 400) throw new Error('The free 3D worker rejected this source or export format.');
    throw new Error(`The free 3D worker returned HTTP ${response.status}.`);
  }
  const contentType=response.headers.get('content-type')||'';
  if(!contentType.includes('application/json'))throw new Error('The free 3D endpoint is not returning JSON; check the worker URL.');
  const result:unknown=await response.json();
  if(!result || typeof result!=='object' || Array.isArray(result))throw new Error('The free 3D worker returned an invalid response.');
  return result as Record<string,unknown>;
}
function secureUrl(value:unknown){
  if (typeof value!=='string') return null;
  try { const url=new URL(value); return url.protocol==='https:'?url.toString():null; }catch{return null;}
}
const readyStatuses=new Set(['queued','running','completed','failed']);
function assetResponse(json:Record<string,unknown>,model:Open3dModel,jobId:string,format:string){
  const status=String(json['status']??'queued').toLowerCase();
  if(!readyStatuses.has(status))throw new Error('The free 3D worker returned an unknown job status.');
  const outputUrl=secureUrl(json['output_url']);
  const safeStatus=status==='completed'&&!outputUrl?'failed':status;
  return {
    workerJobId:jobId,status:safeStatus,outputUrl:safeStatus==='completed'?outputUrl:null,
    previewUrl:secureUrl(json['preview_url']),
    errorMessage:safeStatus==='failed'?
      (status==='completed'?'The free 3D worker reported completion without a real HTTPS mesh.':
        typeof json['error']==='string' ? String(json['error']).slice(0,180):'The free 3D generation job failed.'):null,
    metadata:{model,requestedFormat:format,freeWorker:true},provider:provider(model),
  };
}
export async function open3dHealth() {
  if(!isOpen3dConfigured())return {connected:false,models:[] as Open3dModel[]};
  try {
    const response=await callOpen3d('/v1/health','GET');
    const value=response['models'];
    if(!Array.isArray(value))return {connected:false,models:[] as Open3dModel[]};
    const models=OPEN3D_MODELS.filter(m=>value.some(x=>x && typeof x==='object' && (x as any).id===m && (x as any).ready===true));
    return {connected:true,models};
  }catch{
    return {connected:false,models:[] as Open3dModel[]};
  }
}
export async function submitOpen3dAsset(input:{
  model:Open3dModel; sourceKind:Kind; prompt?:string|null; sourceUrl?:string|null;
  outputFormat:string; qualityProfile:string; targetEngine:string;
}){
  if(!modelSupportsSource(input.model,input.sourceKind))throw new Error(`${input.model} does not accept that input type. TripoSR requires an image.`);
  const outputFormat=input.outputFormat.toLowerCase();
  if(!['obj','glb'].includes(outputFormat))throw new Error('The free 3D engines support OBJ and GLB exports. Select one of these formats.');
  // Do not send a job to a backend which cannot run the explicitly selected model.
  const health=await open3dHealth();
  if(!health.connected || !health.models.includes(input.model))throw new Error(`The ${input.model} free 3D engine is offline or cannot run on the connected machine. Check its installation and GPU capacity.`);
  const json=await callOpen3d('/v1/assets/generate','POST',{
    generator:input.model,source_kind:input.sourceKind,
    prompt:input.sourceKind==='prompt'?input.prompt?.slice(0,10000):null,
    source_url:input.sourceKind==='image'?input.sourceUrl:null,
    output_format:outputFormat,quality_profile:input.qualityProfile,target_engine:input.targetEngine,
  });
  const id=String(json['id']??json['job_id']??'');
  if(!/^[a-f\d-]{36}$/i.test(id))throw new Error('The free 3D worker did not return a valid job ID.');
  return assetResponse(json,input.model,id,outputFormat);
}
export async function getOpen3dAssetJob(jobId:string,selectedProvider:Open3dProvider,format:string){
  if(!/^[a-f\d-]{36}$/i.test(jobId))throw new Error('Invalid free 3D job ID.');
  const model=selectedProvider.slice('open3d-'.length) as Open3dModel;
  if(!OPEN3D_MODELS.includes(model))throw new Error('Unknown free 3D model.');
  const json=await callOpen3d(`/v1/assets/jobs/${encodeURIComponent(jobId)}`,'GET');
  return assetResponse(json,model,jobId,format);
}
