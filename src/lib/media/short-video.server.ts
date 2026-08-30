import { normalizeMediaJobStatus } from '@/lib/media/media-utils';

type JsonObject = Record<string, unknown>;

function config() {
  return {
    url: (process.env['SHORT_VIDEO_WORKER_URL'] ?? '').replace(/\/$/, ''),
    token: process.env['SHORT_VIDEO_WORKER_TOKEN'] ?? '',
  };
}

function headers(token: string): Record<string, string> {
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

export function assertPublicMediaUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('Media URL must be a valid absolute URL.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Media URL must use HTTP or HTTPS.');
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local')) {
    throw new Error('Private or local media URLs are not allowed.');
  }
  const match = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(host);
  if (match) {
    const a = Number(match[1]);
    const b = Number(match[2]);
    if (a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
      throw new Error('Private or local media URLs are not allowed.');
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
  if (!id) throw new Error('Short-video worker did not return a job ID.');
  return id;
}

function outputUrl(result: JsonObject): string | null {
  return typeof result['outputUrl'] === 'string'
    ? result['outputUrl']
    : typeof result['url'] === 'string'
      ? result['url']
      : null;
}

export function getShortVideoCapabilities() {
  const cfg = config();
  return {
    configured: Boolean(cfg.url),
    workflow: 'automated-short-video',
    aspectRatios: ['9:16', '16:9', '1:1'],
    durationSeconds: [15, 30, 45, 60, 90, 120, 180],
    materialSources: ['stock', 'generated', 'provided'],
    subtitleModes: ['sentence', 'word'],
    transitions: ['none', 'fade', 'slide'],
    note: 'PalladiumAI owns planning, authentication, job history and audit state. Rendering, stock-media retrieval, subtitle alignment and FFmpeg/MoviePy-style composition run on the separately deployed short-video worker.',
  };
}

export async function submitShortVideoJob(input: {
  script: string;
  aspectRatio: string;
  durationSeconds: number;
  materialSource: 'stock' | 'generated' | 'provided';
  sourceUrls?: string[];
  voice: string;
  subtitles: boolean;
  subtitleMode: 'sentence' | 'word';
  backgroundMusic: boolean;
  transition: 'none' | 'fade' | 'slide';
}) {
  const cfg = config();
  if (!cfg.url) throw new Error('Automated short-video worker is not configured on this deployment.');
  const sourceUrls = (input.sourceUrls ?? []).map(assertPublicMediaUrl);
  if (input.materialSource === 'provided' && sourceUrls.length === 0) {
    throw new Error('At least one public media URL is required when using provided media.');
  }

  const response = await fetch(`${cfg.url}/jobs`, {
    method: 'POST',
    headers: headers(cfg.token),
    body: JSON.stringify({
      workflow: 'automated-short-video',
      script: input.script,
      aspect_ratio: input.aspectRatio,
      duration_seconds: input.durationSeconds,
      material_source: input.materialSource,
      source_urls: sourceUrls,
      narration: { enabled: true, voice: input.voice },
      subtitles: { enabled: input.subtitles, mode: input.subtitleMode },
      background_music: { enabled: input.backgroundMusic },
      transition: input.transition,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Short-video worker rejected the job (${response.status})${raw ? `: ${raw.slice(0, 500)}` : ''}`);
  const result = parseJson(raw, 'Short-video worker');
  return {
    workerJobId: jobId(result),
    status: normalizeMediaJobStatus(result['status']),
    outputUrl: outputUrl(result),
  };
}

export async function getShortVideoJob(workerJobId: string) {
  const cfg = config();
  if (!cfg.url) throw new Error('Automated short-video worker is not configured on this deployment.');
  const response = await fetch(`${cfg.url}/jobs/${encodeURIComponent(workerJobId)}`, {
    method: 'GET',
    headers: headers(cfg.token),
    signal: AbortSignal.timeout(60_000),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Short-video worker status check failed (${response.status})${raw ? `: ${raw.slice(0, 500)}` : ''}`);
  const result = parseJson(raw, 'Short-video worker');
  return {
    status: normalizeMediaJobStatus(result['status']),
    outputUrl: outputUrl(result),
    errorMessage: typeof result['error'] === 'string' ? result['error'].slice(0, 1000) : null,
    metadata: {
      progress: typeof result['progress'] === 'number' ? result['progress'] : null,
      stage: typeof result['stage'] === 'string' ? result['stage'] : null,
      providerJobStatus: typeof result['status'] === 'string' ? result['status'] : null,
    },
  };
}
