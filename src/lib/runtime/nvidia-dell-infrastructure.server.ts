/**
 * NVIDIA NIM fits the existing OpenAI-compatible Blackstar model gateway.
 * Dell AI Factory is an optional deployment TARGET for the NIM endpoint,
 * not an imaginary Dell-hosted text-generation API.
 *
 * Secrets and endpoint URLs are configured only by deployment operators.
 */
export const NVIDIA_NIM_HOSTED_BASE_URL = 'https://integrate.api.nvidia.com/v1';
export const NVIDIA_NIM_DEFAULT_MODEL = 'openai/gpt-oss-20b';

const enabled = (raw: string | undefined) =>
  ['1', 'true', 'yes', 'on'].includes(raw?.trim().toLowerCase() ?? '');

export function nvidiaNimBaseUrl(): string {
  const raw = process.env['NVIDIA_NIM_BASE_URL']?.trim();
  if (!raw) return NVIDIA_NIM_HOSTED_BASE_URL;
  // Fail closed: a custom deployment endpoint is selected only via server
  // configuration. No model or end-user input can override the route.
  let url: URL;
  try { url = new URL(raw); }
  catch { throw new Error('The NVIDIA NIM endpoint configuration is invalid.'); }
  if (url.protocol !== 'https:' || !url.hostname ||
      url.username || url.password || url.search || url.hash ||
      url.pathname.replace(/\/+$/, '') !== '/v1') {
    throw new Error('NVIDIA NIM requires an HTTPS /v1 endpoint without embedded credentials, query or fragment.');
  }
  const host = url.hostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');
  // Vercel cannot directly reach LAN/loopback NIM servers. Configure a
  // dedicated authenticated HTTPS service front end for Dell-hosted NIM.
  if (host === 'localhost' || host.endsWith('.localhost') ||
      host.endsWith('.local') || host.endsWith('.internal') ||
      /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(':')) {
    throw new Error('NVIDIA NIM must use an authenticated publicly routable HTTPS hostname.');
  }
  return url.href.replace(/\/+$/, '');
}

export function nvidiaNimKey(): string {
  return process.env['NVIDIA_API_KEY']?.trim() || '';
}

/**
 * Enabling NVIDIA as a primary provider is separate from authorising
 * automatic cross-provider fallback, which may consume metered tokens.
 * Off by default even when NVIDIA_API_KEY is configured.
 */
export function nvidiaNimFallbackEnabled(): boolean {
  return enabled(process.env['NVIDIA_NIM_FALLBACK_ENABLED']);
}

export function nvidiaNimConfigured() {
  if (!nvidiaNimKey()) return false;
  try { nvidiaNimBaseUrl(); return true; }
  catch { return false; }
}

export function nvidiaNimModel() {
  return process.env['NVIDIA_NIM_MODEL']?.trim() || NVIDIA_NIM_DEFAULT_MODEL;
}

/** Informational readiness only. Never claim physical Dell hardware is live. */
export function nvidiaDellInfrastructureReadiness() {
  const dellSelected = enabled(process.env['DELL_AI_FACTORY_ENABLED']);
  const endpointSelected = Boolean(process.env['NVIDIA_NIM_BASE_URL']?.trim());
  const nvidiaConfigured = nvidiaNimConfigured();
  let endpointValid = false;
  try { nvidiaNimBaseUrl(); endpointValid = true; } catch { /* fail closed */ }
  return {
    nvidia: {
      provider: 'nvidia',
      configured: nvidiaConfigured,
      mode: endpointSelected ? 'operator_hosted_nim' : 'nvidia_api_catalog',
      model: nvidiaNimModel(),
      // Not proof of an actual model invocation, which needs its own receipt.
      liveInferenceVerified: false,
    },
    dell: {
      profile: 'dell_ai_factory_with_nvidia',
      selected: dellSelected,
      endpointConfigured: endpointSelected && endpointValid && nvidiaConfigured,
      hardwareVerified: false,
      workerVerified: false,
      status: !dellSelected ? 'not_enabled' :
        !endpointSelected ? 'awaiting_private_nim_endpoint' :
        !endpointValid ? 'invalid_endpoint' :
        !nvidiaConfigured ? 'awaiting_credentials' : 'configured_not_verified',
    },
  } as const;
}

/**
 * Read-only health evidence for an explicitly operator-hosted NIM deployment.
 * NVIDIA's hosted API Catalog is not a self-hosted NIM container, so its
 * container readiness endpoint is intentionally not probed.
 * This is a model-server readiness signal, NOT a GPU or Dell attestation.
 */
export type NvidiaNimHealthStatus = 'not_applicable' | 'not_configured' | 'ready' |
  'not_ready' | 'unauthorised' | 'unsupported' | 'unavailable';

export async function probeNvidiaNimReadiness(): Promise<NvidiaNimHealthStatus> {
  if (!process.env['NVIDIA_NIM_BASE_URL']?.trim()) return 'not_applicable';
  if (!nvidiaNimConfigured()) return 'not_configured';
  try {
    const response = await fetch(`${nvidiaNimBaseUrl()}/health/ready`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${nvidiaNimKey()}`, Accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 200) return 'ready';
    if (response.status === 503) return 'not_ready';
    if (response.status === 401 || response.status === 403) return 'unauthorised';
    if (response.status === 404 || response.status === 405 || response.status === 501) return 'unsupported';
    return 'unavailable';
  } catch {
    // Never surface the configured NIM endpoint, upstream body, or key.
    return 'unavailable';
  }
}

/**
 * Explicit operator-initiated, read-only model-catalogue probe.
 * A successful GET /models proves response from the configured endpoint,
 * but does NOT prove generation, tool calling, streaming, or Dell GPU access.
 */
export async function probeNvidiaNimModels(): Promise<{
  status: 'not_configured' | 'reachable' | 'model_missing' | 'unauthorised' | 'unsupported' | 'unavailable';
  checkedAt: string;
  configuredModel: string;
  modelListed: boolean;
  nimReadiness: NvidiaNimHealthStatus;
}> {
  const nimReadiness = await probeNvidiaNimReadiness();
  const checkedAt = new Date().toISOString();
  const configuredModel = nvidiaNimModel();
  const result = (
    status: 'not_configured' | 'reachable' | 'model_missing' | 'unauthorised' | 'unsupported' | 'unavailable',
    modelListed = false,
  ) => ({ status, checkedAt, configuredModel, modelListed, nimReadiness });
  if (!nvidiaNimConfigured()) return result('not_configured');
  try {
    const response = await fetch(`${nvidiaNimBaseUrl()}/models`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${nvidiaNimKey()}`,
        Accept: 'application/json',
      },
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 401 || response.status === 403) return result('unauthorised');
    if (response.status === 404 || response.status === 405 || response.status === 501) return result('unsupported');
    if (!response.ok) return result('unavailable');
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || !('data' in data)) return result('unsupported');
    const models = (data as { data?: unknown }).data;
    if (!Array.isArray(models)) return result('unsupported');
    const listed = models.some((item: unknown) => item !== null &&
      typeof item === 'object' && 'id' in item &&
      (item as { id: unknown }).id === configuredModel);
    return result(listed ? 'reachable' : 'model_missing', listed);
  } catch {
    // Never expose the actual endpoint URL, credential, returned body or an
    // upstream exception to users; it could contain internal deployment data.
    return result('unavailable');
  }
}
