export type MediaJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export function normalizeMediaJobStatus(value: unknown): MediaJobStatus {
  const status = String(value ?? '').toLowerCase();
  if (status === 'completed' || status === 'complete' || status === 'ready' || status === 'success') return 'completed';
  if (status === 'failed' || status === 'error' || status === 'cancelled') return 'failed';
  if (status === 'running' || status === 'processing' || status === 'active') return 'running';
  return 'queued';
}
