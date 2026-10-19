import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeSupabase } from './fake-supabase';

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    const f = { middleware: () => f, handler: (handler: unknown) => handler };
    return f;
  },
}));
vi.mock('@/integrations/supabase/auth-middleware', () => ({ requireSupabaseAuth: {} }));

const mocked = vi.hoisted(() => ({
  admin: vi.fn(), probe: vi.fn(), certEnabled: vi.fn(), cert: vi.fn(),
  nvidiaReady: vi.fn(), credentials: vi.fn(),
}));
vi.mock('@/lib/marketplace/marketplace.server', () => ({ isPlatformAdmin: mocked.admin }));
vi.mock('../nvidia-dell-infrastructure.server', () => ({
  nvidiaNimConfigured: mocked.nvidiaReady,
  nvidiaDellInfrastructureReadiness: () => ({ nvidia: { configured: true }, dell: { hardwareVerified: false } }),
  probeNvidiaNimModels: mocked.probe,
}));
vi.mock('../nvidia-inference-certification.server', () => ({
  nvidiaInferenceProbeEnabled: mocked.certEnabled, certifyNvidiaInference: mocked.cert,
}));
vi.mock('../blackstar-astra-runtime-readiness.server', () => ({
  resolveBlackstarAstraRuntimeReadiness: vi.fn().mockResolvedValue(null),
}));
vi.mock('../model-provider-credentials.server', () => ({
  listUserModelProviderCredentials: mocked.credentials,
}));
vi.mock('../model-providers.server', () => ({
  isModelProviderConfigured: (id: string) => id === 'nvidia',
  listModelProviderDefinitions: () => [
    { id: 'nvidia', name: 'NVIDIA NIM', defaultModel: 'openai/gpt-oss-20b' },
  ],
}));
import {
  getModelRuntimeOverview, probeNvidiaModelConnection, certifyNvidiaModelInference,
} from '../model-management.functions';

const db = () => createFakeSupabase({
  personal_agents: [
    { id: 'agent-owned', user_id: 'owner', name: 'Own QA agent', status: 'active',
      model_provider: 'nvidia', model: 'openai/gpt-oss-20b', updated_at: '2026-10-20' },
    { id: 'agent-other', user_id: 'other', name: 'Foreign private agent', status: 'active',
      model_provider: 'openai', model: 'secret-model', updated_at: '2026-10-21' },
  ],
  agent_tasks: [
    { id: 'run-owned', user_id: 'owner', agent_id: 'agent-owned', provider: 'nvidia',
      model: 'openai/gpt-oss-20b', status: 'succeeded', tokens_in: 8, tokens_out: 5,
      cost_pence: 2, created_at: '2026-10-20' },
    { id: 'run-other', user_id: 'other', agent_id: 'agent-other', provider: 'openai',
      model: 'private-model', status: 'succeeded', tokens_in: 900, tokens_out: 800,
      cost_pence: 555, created_at: '2026-10-21' },
  ],
});
const invoke = (fn: any, sb: ReturnType<typeof db>, userId = 'owner') =>
  fn({ context: { supabase: sb, userId } });

beforeEach(() => {
  vi.clearAllMocks();
  mocked.admin.mockResolvedValue(false);
  mocked.nvidiaReady.mockReturnValue(true);
  mocked.certEnabled.mockReturnValue(true);
  mocked.credentials.mockResolvedValue([]);
  mocked.probe.mockResolvedValue({ status: 'reachable', modelListed: true });
});

describe('Runtime Models NVIDIA diagnostics and ownership', () => {
  it('returns only this user\'s agents, model usage and cost even with cross-user database access', async () => {
    const result = await invoke(getModelRuntimeOverview, db());
    expect(result.assignments.map((a: { id: string }) => a.id)).toEqual(['agent-owned']);
    expect(result.usage).toEqual([expect.objectContaining({
      provider: 'nvidia', runs: 1, tokensIn: 8, tokensOut: 5, costPence: 2,
    })]);
    expect(result.totals).toMatchObject({
      agents: 1, recentRuns: 1, recentCostPence: 2,
    });
    expect(JSON.stringify(result)).not.toMatch(/Foreign private agent|private-model|secret-model|555/);
    expect(result.nvidiaConnectionProbeAllowed).toBe(false);
    expect(result.nvidiaInferenceCertificationEnabled).toBe(false);
  });

  it('allows an admin to see diagnostics buttons without claiming inference or hardware proof', async () => {
    mocked.admin.mockResolvedValue(true);
    const result = await invoke(getModelRuntimeOverview, db());
    expect(result.nvidiaConnectionProbeAllowed).toBe(true);
    expect(result.nvidiaInferenceCertificationEnabled).toBe(true);
    expect(result.acceleratorInfrastructure.dell.hardwareVerified).toBe(false);
  });

  it('does not call the shared NVIDIA model API for an ordinary authenticated user', async () => {
    const result = await invoke(probeNvidiaModelConnection, db());
    expect(result).toEqual({ forbidden: true });
    expect(mocked.probe).not.toHaveBeenCalled();
  });

  it('allows a platform admin to invoke the read-only NVIDIA model probe', async () => {
    mocked.admin.mockResolvedValue(true);
    const result = await invoke(probeNvidiaModelConnection, db());
    expect(result).toEqual({ forbidden: false, status: 'reachable', modelListed: true });
    expect(mocked.probe).toHaveBeenCalledTimes(1);
  });

  it('fails closed if admin lookup fails', async () => {
    mocked.admin.mockRejectedValue(new Error('role lookup unavailable'));
    await expect(invoke(probeNvidiaModelConnection, db())).rejects.toThrow('role lookup unavailable');
    expect(mocked.probe).not.toHaveBeenCalled();
    const overview = await invoke(getModelRuntimeOverview, db());
    expect(overview.nvidiaConnectionProbeAllowed).toBe(false);
    expect(overview.nvidiaInferenceCertificationEnabled).toBe(false);
  });

  it('preserves administrator-only gate for chargeable inference certification', async () => {
    const result = await invoke(certifyNvidiaModelInference, db());
    expect(result).toEqual({ forbidden: true });
    expect(mocked.cert).not.toHaveBeenCalled();
  });
});
