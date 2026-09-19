import { normalizeMediaJobStatus } from '@/lib/media/media-utils';
import { getDirectLtx23, hasDirectLtx23Provider, submitDirectLtx23 } from '@/lib/media/ltx23-provider.server';
import { getDirectSeedream, getFalServerKey, hasDirectSeedreamProvider, submitDirectSeedream } from '@/lib/media/seedream-provider.server';

type Provider = 'seedream' | 'ltx';
type JsonObject = Record<string, unknown>;

export const BLACKSTAR_HOSTED_KEYFRAME_WORKER_URL='https://blackstar-cinema-keyframe-worker-y3s7rg.v2.appdeploy.ai';
export const BLACKSTAR_HOSTED_MOTION_WORKER_URL='https://blackstar-auto-editor-worker-0kjxvk.v2.appdeploy.ai';

export function resolveSeedreamProvider(){
  const forceWorker=(process.env['SEEDREAM_PROVIDER']??'').trim().toLowerCase()==='worker';
  if(hasDirectSeedreamProvider()&&!forceWorker) return 'direct' as const;
  const workerUrl=(process.env['SEEDREAM_WORKER_URL']??'').trim();
  if(workerUrl) return 'worker' as const;
  if(hasDirectSeedreamProvider()) return 'direct' as const;
  return 'hosted' as const;
}

function config(provider: Provider) {
  if (provider === 'seedream') {
    const custom=(process.env['SEEDREAM_WORKER_URL'] ?? '').replace(/\/$/, '');
    const resolution=resolveSeedreamProvider();
    return {
      url: custom || (resolution==='hosted' ? BLACKSTAR_HOSTED_KEYFRAME_WORKER_URL : ''),
      token: custom ? process.env['SEEDREAM_WORKER_TOKEN'] ?? '' : '',
      kind: 'image' as const,
      hosted: resolution==='hosted',
    };
  }
  const custom=(process.env['LTX_WORKER_URL'] ?? '').replace(/\/$/, '');
  const hosted=!custom&&!hasDirectLtx23Provider();
  return {
    url: custom || (hosted ? BLACKSTAR_HOSTED_MOTION_WORKER_URL : ''),
    token: custom ? process.env['LTX_WORKER_TOKEN'] ?? '' : '',
    kind: 'video' as const,
    hosted,
  };
}

function headers(token: string): Record<string, string> {
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

function publicUrl(value: string | null | undefined) {
  if (!value) return null;
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('Source URL must be a valid absolute URL.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Source URL must use HTTP or HTTPS.');
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local')) {
    throw new Error('Private or local source URLs are not allowed.');
  }
  const match = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(host);
  if (match) {
    const a = Number(match[1]);
    const b = Number(match[2]);
    if (a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
      throw new Error('Private or local source URLs are not allowed.');
    }
  }
  return url.toString();
}

function parseJson(raw: string, label: string): JsonObject {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error(`${label} returned invalid JSON.`); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(`${label} returned an invalid response.`);
  return parsed as JsonObject;
}

function jobId(result: JsonObject): string {
  const id = typeof result['id'] === 'string' ? result['id'] : typeof result['jobId'] === 'string' ? result['jobId'] : null;
  if (!id) throw new Error('Generation worker did not return a job ID.');
  return id;
}

function outputUrl(result: JsonObject): string | null {
  const value = typeof result['outputUrl'] === 'string'
    ? result['outputUrl']
    : typeof result['url'] === 'string'
      ? result['url']
      : null;
  return value;
}

export function getGenerativeMediaCapabilities() {
  const seedream = config('seedream');
  const ltx = config('ltx');
  const falKeyVisible=Boolean(getFalServerKey());
  return {
    diagnostics:{falKeyVisible},
    seedream: {
      configured: true,
      provider:resolveSeedreamProvider(),
      kind: seedream.kind,
      workflows: resolveSeedreamProvider()==='hosted' ? ['text-to-image'] : ['text-to-image', 'image-edit', 'multi-image-composite'],
      aspectRatios: ['1:1', '4:5', '3:4', '16:9', '9:16', '21:9'],
      note: resolveSeedreamProvider()==='direct'
        ? 'Cinema keyframes use fal Seedream server-side through Blackstar\'s FAL_KEY.'
        : resolveSeedreamProvider()==='worker'
          ? 'Cinema keyframes use the configured Seedream-compatible worker.'
          : 'Cinema keyframes use Blackstar\'s hosted image-generation worker. Configure FAL_KEY for the premium Seedream lane.',
    },
    ltx: {
      configured: true,
      provider:ltx.hosted?'hosted-motion-fallback':ltx.url?'worker':hasDirectLtx23Provider()?'direct':'unconfigured',
      kind: ltx.kind,
      workflows: ltx.hosted ? ['image-to-video'] : ltx.url ? ['text-to-video', 'image-to-video', 'audio-video'] : ['image-to-video'],
      aspectRatios: ['16:9', '9:16'],
      durationSeconds: [3, 5, 8, 10],
      note: ltx.hosted
        ? 'Video segments use Blackstar\'s hosted FFmpeg motion fallback. Configure FAL_KEY or LTX_WORKER_URL for premium generative LTX motion.'
        : ltx.url
          ? 'LTX generation uses the configured worker.'
          : 'LTX video segments use fal LTX-2.3 server-side; provider minimum durations are trimmed to Blackstar logical timing during mastering.',
    },
  };
}

export async function submitGenerativeMediaJob(input: {
  provider: Provider;
  prompt: string;
  aspectRatio: string;
  sourceUrl?: string | null;
  durationSeconds?: number | null;
}) {
  const cfg = config(input.provider);
  const sourceUrl = publicUrl(input.sourceUrl);
  if (input.provider === 'seedream' && resolveSeedreamProvider()==='direct') {
    if (sourceUrl) throw new Error('Direct Seedream fallback currently supports text-to-image keyframes only.');
    return submitDirectSeedream({ prompt: input.prompt, aspectRatio: input.aspectRatio });
  }
  const customLtxWorker=Boolean((process.env['LTX_WORKER_URL']??'').trim());
  if (input.provider === 'ltx' && !customLtxWorker && hasDirectLtx23Provider()) {
    if (!sourceUrl) throw new Error('LTX-2.3 image-to-video requires a completed keyframe URL.');
    return submitDirectLtx23({ prompt: input.prompt, sourceUrl, aspectRatio: input.aspectRatio, durationSeconds: input.durationSeconds ?? 5 });
  }
  if (!cfg.url) throw new Error(`${input.provider === 'seedream' ? 'Seedream' : 'LTX'} generation worker is not configured on this deployment.`);
  const body = input.provider === 'seedream'
    ? {
        workflow: sourceUrl ? 'image-edit' : 'text-to-image',
        prompt: input.prompt,
        aspect_ratio: input.aspectRatio,
        ...(sourceUrl ? { source_url: sourceUrl } : {}),
      }
    : {
        workflow: sourceUrl ? 'image-to-video' : 'text-to-video',
        prompt: input.prompt,
        aspect_ratio: input.aspectRatio,
        duration_seconds: input.durationSeconds ?? 5,
        generate_audio: true,
        ...(sourceUrl ? { source_url: sourceUrl } : {}),
      };

  const jobsPath=input.provider==='seedream'&&cfg.hosted?'/api/jobs':'/jobs';
  const response = await fetch(`${cfg.url}${jobsPath}`, {
    method: 'POST',
    headers: headers(cfg.token),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Generation worker rejected the job (${response.status})${raw ? `: ${raw.slice(0, 500)}` : ''}`);
  const result = parseJson(raw, 'Generation worker');
  return {
    workerJobId: jobId(result),
    status: normalizeMediaJobStatus(result['status']),
    outputUrl: outputUrl(result),
  };
}

export async function getGenerativeMediaJob(provider: Provider, workerJobId: string) {
  const cfg = config(provider);
  if (provider === 'seedream' && resolveSeedreamProvider()==='direct') return getDirectSeedream(workerJobId);
  const customLtxWorker=Boolean((process.env['LTX_WORKER_URL']??'').trim());
  if (provider === 'ltx' && !customLtxWorker && hasDirectLtx23Provider()) return getDirectLtx23(workerJobId);
  if (!cfg.url) throw new Error(`${provider === 'seedream' ? 'Seedream' : 'LTX'} generation worker is not configured on this deployment.`);
  const jobsPath=provider==='seedream'&&cfg.hosted?'/api/jobs':'/jobs';
  const response = await fetch(`${cfg.url}${jobsPath}/${encodeURIComponent(workerJobId)}`, {
    method: 'GET',
    headers: headers(cfg.token),
    signal: AbortSignal.timeout(60_000),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Generation worker status check failed (${response.status})${raw ? `: ${raw.slice(0, 500)}` : ''}`);
  const result = parseJson(raw, 'Generation worker');
  return {
    status: normalizeMediaJobStatus(result['status']),
    outputUrl: outputUrl(result),
    errorMessage: typeof result['error'] === 'string' ? result['error'].slice(0, 1000) : null,
    metadata: {
      progress: typeof result['progress'] === 'number' ? result['progress'] : null,
      model: typeof result['model'] === 'string' ? result['model'] : null,
      providerJobStatus: typeof result['status'] === 'string' ? result['status'] : null,
    },
  };
}
