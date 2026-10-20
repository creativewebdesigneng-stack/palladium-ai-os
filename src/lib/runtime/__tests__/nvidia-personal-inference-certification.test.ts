import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const stub = vi.hoisted(() => ({
  chat: vi.fn(), audit: vi.fn(), access: vi.fn(),
}));
vi.mock('../model-gateway.server', () => ({ runChatPinned: stub.chat }));
vi.mock('@/lib/platform/audit.server', () => ({ writeAuditRequired: stub.audit }));
vi.mock('../model-provider-credentials.server', () => ({
  nvidiaPersonalCredentialsEnabled: () => process.env['NVIDIA_PERSONAL_CREDENTIALS_ENABLED'] === 'true',
  resolveUserModelProviderAccess: stub.access,
}));
import { ProviderError } from '../model-gateway.base';
import {
  certifyPersonalNvidiaInference, NVIDIA_INFERENCE_CERTIFICATION_MARKER,
} from '../nvidia-inference-certification.server';

const sample = () => ({
  provider: 'nvidia', model: 'openai/gpt-oss-20b',
  text: NVIDIA_INFERENCE_CERTIFICATION_MARKER, toolCalls: [],
  usage: { input: 16, output: 9 },
});

beforeEach(() => {
  vi.stubEnv('NVIDIA_PERSONAL_CREDENTIALS_ENABLED', 'true');
  vi.stubEnv('NVIDIA_API_KEY', '');
  vi.stubEnv('NVIDIA_NIM_BASE_URL', 'https://operator.dell.example/v1');
  vi.stubEnv('NVIDIA_NIM_MODEL', 'operator/dell-only-model');
  stub.chat.mockReset().mockResolvedValue(sample());
  stub.audit.mockReset().mockResolvedValueOnce('intent-receipt').mockResolvedValueOnce('outcome-receipt');
  stub.access.mockReset().mockResolvedValue({
    provider: 'nvidia', apiKey: 'synthetic-personal-only-key',
  });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('explicit owner-key NVIDIA hosted inference certification', () => {
  it('never executes paid inference or queries personal credentials if disabled', async () => {
    vi.stubEnv('NVIDIA_PERSONAL_CREDENTIALS_ENABLED', '');
    expect(await certifyPersonalNvidiaInference({ userId: 'alice' })).toMatchObject({
      status: 'not_enabled', auditReceiptId: null,
    });
    expect(stub.access).not.toHaveBeenCalled();
    expect(stub.audit).not.toHaveBeenCalled();
    expect(stub.chat).not.toHaveBeenCalled();
  });

  it('does not use a platform key or spend inference for unconnected user', async () => {
    stub.access.mockResolvedValue(null);
    expect(await certifyPersonalNvidiaInference({ userId: 'other-owner' }))
      .toMatchObject({ status: 'not_connected', auditReceiptId: null });
    expect(stub.access).toHaveBeenCalledWith({ userId: 'other-owner', provider: 'nvidia' });
    expect(stub.chat).not.toHaveBeenCalled();
    expect(stub.audit).not.toHaveBeenCalled();
  });

  it('requires a saved intent audit before any provider cost', async () => {
    stub.audit.mockReset().mockRejectedValue(new Error('secret audit error'));
    expect(await certifyPersonalNvidiaInference({ userId: 'alice' }))
      .toMatchObject({ status: 'audit_unavailable', auditReceiptId: null });
    expect(stub.chat).not.toHaveBeenCalled();
  });

  it('uses only the owner key, canonical hosted model, bounded call and durable proof', async () => {
    const output = await certifyPersonalNvidiaInference({ userId: 'alice' });
    expect(output).toMatchObject({
      status: 'verified', model: 'openai/gpt-oss-20b',
      inputTokens: 16, outputTokens: 9, auditReceiptId: 'outcome-receipt',
    });
    expect(stub.access).toHaveBeenCalledExactlyOnceWith({
      userId: 'alice', provider: 'nvidia',
    });
    expect(stub.chat).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      provider: 'nvidia', model: 'openai/gpt-oss-20b',
      providerAccess: { provider: 'nvidia', apiKey: 'synthetic-personal-only-key' },
      tools: [], maxTokens: 32, maxAttempts: 1, timeoutMs: 15_000,
      allowedProviders: ['nvidia'],
    }));
    expect(stub.audit).toHaveBeenCalledTimes(2);
    expect(stub.audit.mock.invocationCallOrder[0]).toBeLessThan(stub.chat.mock.invocationCallOrder[0]!);
    expect(stub.audit.mock.invocationCallOrder[1]).toBeGreaterThan(stub.chat.mock.invocationCallOrder[0]!);
    expect(stub.audit.mock.calls[0]![0]).toMatchObject({
      userId: 'alice', action: 'model.nvidia_personal_inference_requested',
      metadata: { credentialScope: 'owner', maxCompletionTokens: 32 },
    });
    expect(stub.audit.mock.calls[1]![0]).toMatchObject({
      userId: 'alice', action: 'model.nvidia_personal_inference_result',
      status: 'success', metadata: { requestId: 'intent-receipt', result: 'verified' },
    });
    expect(JSON.stringify(output)).not.toContain('synthetic-personal-only-key');
    expect(JSON.stringify(stub.audit.mock.calls)).not.toContain('synthetic-personal-only-key');
    expect(JSON.stringify(output)).not.toContain('operator.dell.example');
  });

  it('does not certify an unrecorded successful result', async () => {
    stub.audit.mockReset().mockResolvedValueOnce('intent').mockRejectedValueOnce(new Error('private'));
    expect(await certifyPersonalNvidiaInference({ userId: 'alice' })).toMatchObject({
      status: 'audit_unavailable', auditReceiptId: null,
    });
  });

  it.each([
    { ...sample(), text: 'something else' },
    { ...sample(), provider: 'groq' },
    { ...sample(), model: 'operator/dell-only-model' },
    { ...sample(), toolCalls: [{ name: 'browser_task', arguments: {} }] },
  ])('never passes an invalid provider/model/response as verified', async value => {
    stub.chat.mockResolvedValue(value);
    expect(await certifyPersonalNvidiaInference({ userId: 'alice' }))
      .toMatchObject({ status: 'invalid_response', auditReceiptId: 'outcome-receipt' });
    expect(stub.audit.mock.calls[1]![0]).toMatchObject({ status: 'failed' });
  });

  it.each([
    [401, 'unauthorised'], [403, 'unauthorised'],
    [404, 'model_unavailable'], [410, 'model_unavailable'],
    [422, 'model_unavailable'], [402, 'quota_exhausted'],
    [429, 'rate_limited'], [503, 'unavailable'],
  ] as const)('classifies provider HTTP %i without surfacing key, endpoint or body', async (http, status) => {
    stub.chat.mockRejectedValue(new ProviderError('private personal key and account data', http, false));
    const output = await certifyPersonalNvidiaInference({ userId: 'alice' });
    expect(output.status).toBe(status);
    expect(JSON.stringify(output)).not.toContain('private personal key');
    expect(JSON.stringify(stub.audit.mock.calls)).not.toContain('private personal key');
  });
});
