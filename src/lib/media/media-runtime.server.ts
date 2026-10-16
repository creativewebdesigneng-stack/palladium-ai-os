import { normalizeMediaJobStatus } from '@/lib/media/media-utils';
import {providerEndpoint,requestProviderJson} from '@/lib/security/provider-http.server';
import {assertPublicNetworkEndpoint} from '@/lib/security/public-network.server';

type SerializableValue = string | number | boolean | null | SerializableValue[] | { [key: string]: SerializableValue };
type SerializableObject = { [key: string]: SerializableValue };

function connection() {
  const endpoint=providerEndpoint(process.env['AUTO_EDITOR_WORKER_URL']);
  const token=process.env['AUTO_EDITOR_WORKER_TOKEN']?.trim();
  if(!endpoint||!token) throw new Error('An authenticated HTTPS Auto-Editor connection is required.');
  return {endpoint,token};
}
function safeMediaUrl(value:unknown) {
  if(typeof value!=='string')return null;
  try {const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.toString():null;}catch{return null;}
}

function toSerializable(value: unknown): SerializableValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map(toSerializable);
  if (value && typeof value === 'object') {
    const output: SerializableObject = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined && typeof entry !== 'function' && typeof entry !== 'symbol' && typeof entry !== 'bigint') {
        output[key] = toSerializable(entry);
      }
    }
    return output;
  }
  return null;
}

export function getMediaRuntimeCapabilities() {
  return {
    autoEditor: {
      configured: Boolean(providerEndpoint(process.env['AUTO_EDITOR_WORKER_URL'])&&process.env['AUTO_EDITOR_WORKER_TOKEN']?.trim()),
      modes: ['silence'],
      exports: ['mp4', 'mov'],
      note: 'Media edits use an authenticated Auto-Editor connection. A configured connection has not been certified until a real job succeeds.',
    },
  };
}

export async function submitAutoEditorJob(input: {
  sourceUrl: string;
  inputName: string;
  mode: 'silence' | 'motion';
  threshold: number;
  marginBeforeMs: number;
  marginAfterMs: number;
  outputFormat: 'mp4' | 'mov' | 'premiere' | 'resolve' | 'final-cut-pro' | 'shotcut' | 'kdenlive' | 'clip-sequence';
}) {
  const {endpoint,token}=connection();
  const source=safeMediaUrl(input.sourceUrl);if(!source)throw new Error('Media source must use HTTPS without embedded credentials.');
  await assertPublicNetworkEndpoint(new URL(source));
  if(input.mode!=='silence'||!['mp4','mov'].includes(input.outputFormat))throw new Error('This media worker supports silence editing with MP4 or MOV output.');
  const result=await requestProviderJson(new URL(endpoint.toString().replace(/\/+$/,'')+'/jobs'),token,{method:'POST',body:JSON.stringify({...input,sourceUrl:source})});
  const id = typeof result['id'] === 'string' ? result['id'] : typeof result['jobId'] === 'string' ? result['jobId'] : null;
  if (!id||id.length>200||/[\x00-\x1f]/.test(id)) throw new Error('Media worker did not return a valid job ID.');
  const status=normalizeMediaJobStatus(result['status']);const outputUrl=safeMediaUrl(result['outputUrl']);
  if(status==='completed'&&!outputUrl)throw new Error('Completed media job is missing a valid HTTPS output.');
  return { workerJobId: id, status, outputUrl };
}

export async function getAutoEditorJob(workerJobId: string) {
  const {endpoint,token}=connection();
  if(!workerJobId||workerJobId.length>200||/[\x00-\x1f]/.test(workerJobId))throw new Error('Invalid media worker job ID.');
  const result=await requestProviderJson(new URL(endpoint.toString().replace(/\/+$/,'')+'/jobs/'+encodeURIComponent(workerJobId)),token,{method:'GET'});
  const status=normalizeMediaJobStatus(result['status']);const outputUrl=safeMediaUrl(result['outputUrl']);
  if(status==='completed'&&!outputUrl)throw new Error('Completed media job is missing a valid HTTPS output.');
  return {
    status,
    outputUrl,
    errorMessage: typeof result['error'] === 'string' ? result['error'] : null,
    metadata: toSerializable(result) as SerializableObject,
  };
}
