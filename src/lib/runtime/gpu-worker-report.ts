/**
 * Optional accelerator inventory from an existing Cinema/3D worker /health
 * response. Strictly informational: remote JSON is a self-report, never proof
 * of Dell hardware ownership, actual CUDA availability or rendered output.
 * No new worker service, provider routing or GPU scheduling architecture.
 */
export type WorkerGpuReport = {
  source: 'worker_self_report';
  vendor: 'nvidia' | 'amd' | 'intel' | 'other';
  model: string | null;
  vramMiB: number | null;
  cudaAvailable: boolean | null;
  hardwareVerified: false;
  renderingCertified: false;
};

const asObject = (raw: unknown): Record<string, unknown> | null =>
  raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown> : null;

function safeModel(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  // Do not reflect URLs, paths, secrets, raw hardware logs or huge
  // arbitrary worker health payloads into the browser.
  if (!value || value.length > 80 || !/^[a-zA-Z0-9 +().,_-]+$/.test(value)) return null;
  return value;
}

function safeMiB(raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isInteger(raw) ||
      raw < 128 || raw > 1_048_576) return null;
  return raw;
}

/** Extract the optional "gpu" field only from an explicitly ready health
 * response. An unready, failed or unconfigured worker must not claim a GPU.
 */
export function normalizeWorkerGpuReport(health: unknown): WorkerGpuReport | null {
  const response = asObject(health);
  if (!response || response['ready'] !== true) return null;
  const gpu = asObject(response['gpu']);
  if (!gpu) return null;
  const rawVendor = gpu['vendor'];
  if (typeof rawVendor !== 'string') return null;
  const vendor = rawVendor.trim().toLowerCase();
  if (!['nvidia', 'amd', 'intel', 'other'].includes(vendor)) return null;
  return {
    source: 'worker_self_report',
    vendor: vendor as WorkerGpuReport['vendor'],
    model: safeModel(gpu['model'] ?? gpu['name']),
    vramMiB: safeMiB(gpu['vram_mib']),
    cudaAvailable: typeof gpu['cuda_available'] === 'boolean' ? gpu['cuda_available'] : null,
    hardwareVerified: false,
    renderingCertified: false,
  };
}

/** Return only truthful summary states for optional self-reports. */
export function workerGpuPreflightState(worker: {
  healthy?: boolean; reachable?: boolean; gpuReport?: WorkerGpuReport | null;
}) {
  if (!worker?.healthy || !worker?.reachable) return 'worker_unavailable' as const;
  return worker.gpuReport ? 'self_reported' as const : 'not_reported' as const;
}
