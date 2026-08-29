import { normalizeMediaJobStatus } from '@/lib/media/media-utils';

const WORKER_URL = (process.env['AUTO_EDITOR_WORKER_URL'] ?? '').replace(/\/$/, '');

function headers() {
  const token = process.env['AUTO_EDITOR_WORKER_TOKEN'];
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export function getMediaRuntimeCapabilities() {
  return {
    autoEditor: {
      configured: Boolean(WORKER_URL),
      modes: ['silence', 'motion'],
      exports: ['mp4', 'mov', 'premiere', 'resolve', 'final-cut-pro', 'shotcut', 'kdenlive', 'clip-sequence'],
      note: 'Media edits are delegated to a configured Auto-Editor-compatible worker. PalladiumAI never simulates completed media output.',
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
    metadata: result,
  };
}
