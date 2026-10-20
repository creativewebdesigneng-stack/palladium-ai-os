import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    const f: any = { middleware: () => f, inputValidator: () => f, handler: (handler: unknown) => handler };
    return f;
  },
}));
vi.mock('@/integrations/supabase/auth-middleware', () => ({ requireSupabaseAuth: {} }));

const calls = vi.hoisted(() => ({
  saved: vi.fn(), removed: vi.fn(), listed: vi.fn(), access: vi.fn(), audit: vi.fn(),
}));
vi.mock('../model-provider-credentials.server', () => ({
  nvidiaPersonalCredentialsEnabled: () => ['1', 'true', 'on', 'yes'].includes(
    process.env['NVIDIA_PERSONAL_CREDENTIALS_ENABLED']?.trim().toLowerCase() ?? ''),
  saveUserModelProviderCredential: calls.saved,
  deleteUserModelProviderCredential: calls.removed,
  listUserModelProviderCredentials: calls.listed,
  resolveUserModelProviderAccess: calls.access,
}));
vi.mock('@/lib/platform/audit.server', () => ({ writeAudit: calls.audit }));

import { saveModelProviderConnection, testModelProviderConnection,
  deleteModelProviderConnection, listModelProviderConnections } from '../model-provider-credentials.functions';

const invoke = (fn: any, data: object = {}, userId = 'owner') =>
  fn({ context: { userId }, data });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NVIDIA_PERSONAL_CREDENTIALS_ENABLED', 'true');
  calls.saved.mockResolvedValue({ provider: 'nvidia', enabled: true, verifiedAt: '2026-10-20T00:00:00Z' });
  calls.access.mockResolvedValue({ provider: 'nvidia', apiKey: 'personal-private-test-nvidia-key' });
  calls.listed.mockResolvedValue([{ provider: 'nvidia', enabled: true, verifiedAt: '2026-10-20T00:00:00Z' }]);
  calls.removed.mockResolvedValue(undefined);
  calls.audit.mockResolvedValue(undefined);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('NVIDIA owner-managed personal model connection handlers', () => {
  it('does not surface or accept NVIDIA personal connections before operator enablement', async () => {
    vi.stubEnv('NVIDIA_PERSONAL_CREDENTIALS_ENABLED', '');
    const fetcher = vi.spyOn(globalThis, 'fetch');
    const overview = await invoke(listModelProviderConnections);
    expect(overview.providers.some((x: { id: string }) => x.id === 'nvidia')).toBe(false);
    await expect(invoke(saveModelProviderConnection, {
      provider: 'nvidia', apiKey: 'personal-private-test-nvidia-key',
    })).rejects.toThrow(/not enabled/);
    expect(fetcher).not.toHaveBeenCalled();
    expect(calls.saved).not.toHaveBeenCalled();
  });

  it('probes official NVIDIA catalogue with user key, then saves only for authenticated owner', async () => {
    vi.stubEnv('NVIDIA_NIM_BASE_URL', 'https://operator.dell.example/v1');
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ data: [{ id: 'openai/gpt-oss-20b' }] }), { status: 200 },
    ));
    const response = await invoke(saveModelProviderConnection, {
      provider: 'nvidia', apiKey: 'personal-private-test-nvidia-key',
    });
    const [url, config] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://integrate.api.nvidia.com/v1/models');
    expect(config?.redirect).toBe('error');
    expect(new Headers(config?.headers).get('authorization')).toBe('Bearer personal-private-test-nvidia-key');
    expect(calls.saved).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'owner', provider: 'nvidia', apiKey: 'personal-private-test-nvidia-key',
    }));
    expect(response.models).toEqual(['openai/gpt-oss-20b']);
    expect(JSON.stringify(response)).not.toContain('personal-private-test-nvidia-key');
    expect(JSON.stringify(calls.audit.mock.calls[0])).not.toContain('personal-private-test-nvidia-key');
  });

  it('rejects a misleading 200 without model data and never saves the key', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<html>not a model list</html>', { status: 200 }));
    await expect(invoke(saveModelProviderConnection, {
      provider: 'nvidia', apiKey: 'personal-private-test-nvidia-key',
    })).rejects.toThrow(/valid model catalogue/);
    expect(calls.saved).not.toHaveBeenCalled();
  });

  it('returns sanitised auth failures without saving or echoing the key', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('secret body', { status: 401 }));
    await expect(invoke(saveModelProviderConnection, {
      provider: 'nvidia', apiKey: 'personal-private-test-nvidia-key',
    })).rejects.toThrow('NVIDIA rejected that API key.');
    expect(calls.saved).not.toHaveBeenCalled();
  });

  it('tests, lists and revokes only the owner personal NVIDIA credential', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ data: [{ id: 'openai/gpt-oss-20b' }] }), { status: 200 },
    ));
    const tested = await invoke(testModelProviderConnection, { provider: 'nvidia' }, 'owner');
    expect(tested.ok).toBe(true);
    expect(calls.access).toHaveBeenCalledWith({ userId: 'owner', provider: 'nvidia' });
    const found = await invoke(listModelProviderConnections);
    expect(found.providers.find((x: { id: string }) => x.id === 'nvidia')?.connection)
      .toMatchObject({ provider: 'nvidia', enabled: true });
    await invoke(deleteModelProviderConnection, { provider: 'nvidia' }, 'owner');
    expect(calls.removed).toHaveBeenCalledWith({ userId: 'owner', provider: 'nvidia' });
  });
});
