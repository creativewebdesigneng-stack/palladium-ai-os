import { normalizeMediaJobStatus } from '@/lib/media/media-utils';

type Provider = 'seedream' | 'ltx';
type JsonObject = Record<string, unknown>;

function config(provider: Provider) {
  if (provider === 'seedream') {
    return {
      url: (process.env['SEEDREAM_WORKER_URL'] ?? '').replace(/\/$/, ''),
      token: process.env['SEEDREAM_WORKER_TOKEN'] ?? '',
      kind: 'image' as const,
    };
  }
  return {
    url: (process.env['LTX_WORKER_URL'] ?? '').replace(/\/$/, ''),
    token: process.env['LTX_WORKER_TOKEN'] ?? '',
    kind: 'video' as const,
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
  return {
    seedream: {
      configured: Boolean(seedream.url),
      kind: seedream.kind,
      workflows: ['text-to-image', 'image-edit', 'multi-image-composite'],
      aspectRatios: ['1:1', '4:5', '3:4', '16:9', '9:16', '21:9'],
      note: 'Seedream-compatible generation is delegated to a separately deployed worker. PalladiumAI keeps prompts, job ownership and audit state; provider credentials stay server-side.',
    },
    ltx: {
      configured: Boolean(ltx.url),
      kind: ltx.kind,
      workflows: ['text-to-video', 'image-to-video', 'audio-video'],
      aspectRatios: ['16:9', '9:16', '1:1'],
      durationSeconds: [3, 5, 8, 10],
      note: 'LTX-compatible generation is delegated to a GPU worker because model weights and CUDA dependencies do not belong in the PalladiumAI web runtime.',
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
  if (!cfg.url) throw new Error(`${input.provider === 'seedream' ? 'Seedream' : 'LTX'} generation worker is not configured on this deployment.`);
  const sourceUrl = publicUrl(input.sourceUrl);
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

  const response = await fetch(`${cfg.url}/jobs`, {
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
  if (!cfg.url) throw new Error(`${provider === 'seedream' ? 'Seedream' : 'LTX'} generation worker is not configured on this deployment.`);
  const response = await fetch(`${cfg.url}/jobs/${encodeURIComponent(workerJobId)}`, {
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
