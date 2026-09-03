import { normalizeMediaJobStatus } from '@/lib/media/media-utils';

const DEFAULT_WORKER_URL = 'https://blackstar-auto-editor-worker-0kjxvk.appdeploy.com';
const WORKER_URL = (process.env['AUTO_EDITOR_WORKER_URL'] ?? DEFAULT_WORKER_URL).replace(/\/$/, '');

type SerializableValue = string | number | boolean | null | SerializableValue[] | { [key: string]: SerializableValue };
type SerializableObject = { [key: string]: SerializableValue };

function headers(): Record<string, string> {
  const token = process.env['AUTO_EDITOR_WORKER_TOKEN'];
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
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
      configured: Boolean(WORKER_URL),
      modes: ['silence'],
      exports: ['mp4', 'mov'],
      note: 'Media edits are delegated to the Blackstar Auto-Editor execution node. Completed output is returned only after real FFmpeg processing succeeds.',
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
  if (!WORKER_URL) throw new Error('Auto-Editor media worker is not configured on this deployment.');
  const response = await fetch(`${WORKER_URL}/jobs`, { method: 'POST', headers: headers(), body: JSON.stringify(input) });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Media worker rejected the job (${response.status})${raw ? `: ${raw.slice(0, 500)}` : ''}`);
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error('Media worker returned invalid JSON.'); }
  if (!parsed || typeof parsed !== 'object') throw new Error('Media worker returned an invalid job response.');
  const result = parsed as Record<string, unknown>;
  const id = typeof result['id'] === 'string' ? result['id'] : typeof result['jobId'] === 'string' ? result['jobId'] : null;
  if (!id) throw new Error('Media worker did not return a job ID.');
  return { workerJobId: id, status: normalizeMediaJobStatus(result['status']), outputUrl: typeof result['outputUrl'] === 'string' ? result['outputUrl'] : null };
}

export async function getAutoEditorJob(workerJobId: string) {
  if (!WORKER_URL) throw new Error('Auto-Editor media worker is not configured on this deployment.');
  const response = await fetch(`${WORKER_URL}/jobs/${encodeURIComponent(workerJobId)}`, { method: 'GET', headers: headers() });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Media worker status check failed (${response.status})${raw ? `: ${raw.slice(0, 500)}` : ''}`);
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error('Media worker returned invalid JSON.'); }
  if (!parsed || typeof parsed !== 'object') throw new Error('Media worker returned an invalid status response.');
  const result = parsed as Record<string, unknown>;
  return {
    status: normalizeMediaJobStatus(result['status']),
    outputUrl: typeof result['outputUrl'] === 'string' ? result['outputUrl'] : null,
    errorMessage: typeof result['error'] === 'string' ? result['error'] : null,
    metadata: toSerializable(result) as SerializableObject,
  };
}
