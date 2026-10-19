import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => ({ chat: vi.fn(), audit: vi.fn() }));
vi.mock('../model-gateway.server', () => ({ runChatPinned: calls.chat }));
vi.mock('@/lib/platform/audit.server', () => ({ writeAuditRequired: calls.audit }));
import { ProviderError } from '../model-gateway.base';
import { certifyNvidiaInference, nvidiaInferenceProbeEnabled,
  NVIDIA_INFERENCE_CERTIFICATION_MARKER } from '../nvidia-inference-certification.server';

beforeEach(() => {
  calls.audit.mockReset().mockResolvedValueOnce('request-receipt').mockResolvedValueOnce('outcome-receipt');
  calls.chat.mockReset();
  vi.stubEnv('NVIDIA_NIM_BASE_URL', '');
  vi.stubEnv('NVIDIA_NIM_MODEL', '');
  vi.stubEnv('NVIDIA_API_KEY', 'synthetic-preview-nim-key');
  vi.stubEnv('NVIDIA_NIM_INFERENCE_PROBE_ENABLED', 'true');
});
afterEach(() => vi.unstubAllEnvs());

describe('admin-initiated NVIDIA inference certification evidence', () => {
  it('does not invoke NVIDIA or write audits until the operator has explicitly enabled the probe', async () => {
    vi.stubEnv('NVIDIA_NIM_INFERENCE_PROBE_ENABLED', '');
    expect(nvidiaInferenceProbeEnabled()).toBe(false);
    await expect(certifyNvidiaInference({ userId: 'admin-1' }))
      .resolves.toMatchObject({ status: 'not_enabled', auditReceiptId: null });
    expect(calls.audit).not.toHaveBeenCalled();
    expect(calls.chat).not.toHaveBeenCalled();
  });

  it('never invokes inference without server-side NVIDIA credentials', async () => {
    vi.stubEnv('NVIDIA_API_KEY', '');
    expect(nvidiaInferenceProbeEnabled()).toBe(false);
    expect((await certifyNvidiaInference({ userId: 'admin-1' })).status).toBe('not_enabled');
    expect(calls.chat).not.toHaveBeenCalled();
  });

  it('records intent before any metered call, uses a tiny exact pinned NVIDIA request and writes a success receipt', async () => {
    calls.chat.mockResolvedValue({
      text: NVIDIA_INFERENCE_CERTIFICATION_MARKER, provider: 'nvidia',
      model: 'openai/gpt-oss-20b', toolCalls: [], usage: { input: 18, output: 12 },
    });
    const output = await certifyNvidiaInference({ userId: 'admin-1' });
    expect(output).toMatchObject({
      status: 'verified', model: 'openai/gpt-oss-20b',
      inputTokens: 18, outputTokens: 12, auditReceiptId: 'outcome-receipt',
    });
    expect(calls.audit).toHaveBeenCalledTimes(2);
    expect(calls.audit.mock.invocationCallOrder[0]).toBeLessThan(calls.chat.mock.invocationCallOrder[0]!);
    expect(calls.audit.mock.invocationCallOrder[1]).toBeGreaterThan(calls.chat.mock.invocationCallOrder[0]!);
    expect(calls.chat).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'nvidia', model: 'openai/gpt-oss-20b',
      tools: [], maxTokens: 32, maxAttempts: 1, timeoutMs: 15_000,
      allowedProviders: ['nvidia'],
    }));
    expect(calls.audit.mock.calls[1]![0]).toMatchObject({
      userId: 'admin-1', action: 'model.nvidia_probe_result',
      status: 'success', metadata: { requestId: 'request-receipt', result: 'verified' },
    });
    expect(JSON.stringify(output)).not.toContain('synthetic-preview-nim-key');
  });

  it('does not incur a model charge when audit intent cannot be saved', async () => {
    calls.audit.mockReset().mockRejectedValue(new Error('audit unavailable'));
    expect(await certifyNvidiaInference({ userId: 'admin-1' }))
      .toMatchObject({ status: 'audit_unavailable', auditReceiptId: null });
    expect(calls.chat).not.toHaveBeenCalled();
  });

  it('never certifies a model result if its completion audit cannot be saved', async () => {
    calls.audit.mockReset().mockResolvedValueOnce('intent').mockRejectedValueOnce(new Error('down'));
    calls.chat.mockResolvedValue({
      text: NVIDIA_INFERENCE_CERTIFICATION_MARKER,
      provider: 'nvidia', model: 'openai/gpt-oss-20b',
      toolCalls: [], usage: { input: 11, output: 5 },
    });
    expect(await certifyNvidiaInference({ userId: 'admin-1' }))
      .toMatchObject({ status: 'audit_unavailable', auditReceiptId: null });
  });

  it.each([
    { text: '', provider: 'nvidia', model: 'openai/gpt-oss-20b', toolCalls: [] },
    { text: 'incorrect', provider: 'nvidia', model: 'openai/gpt-oss-20b', toolCalls: [] },
    { text: NVIDIA_INFERENCE_CERTIFICATION_MARKER, provider: 'groq', model: 'openai/gpt-oss-20b', toolCalls: [] },
    { text: NVIDIA_INFERENCE_CERTIFICATION_MARKER, provider: 'nvidia', model: 'fake', toolCalls: [] },
    { text: NVIDIA_INFERENCE_CERTIFICATION_MARKER, provider: 'nvidia', model: 'openai/gpt-oss-20b', toolCalls: [{ name: 'http_request' }] },
  ])('rejects unverified model completions without synthetic success', async output => {
    calls.chat.mockResolvedValue({ ...output, usage: { input: 6, output: 2 } });
    expect(await certifyNvidiaInference({ userId: 'admin-1' }))
      .toMatchObject({ status: 'invalid_response', auditReceiptId: 'outcome-receipt' });
    expect(calls.audit.mock.calls[1]![0]).toMatchObject({ status: 'failed' });
  });

  it.each([
    [401, 'unauthorised'], [403, 'unauthorised'],
    [402, 'quota_exhausted'], [429, 'rate_limited'], [503, 'unavailable'],
  ] as const)('returns non-secret classification for upstream status %d', async (http, status) => {
    calls.chat.mockRejectedValue(new ProviderError('Private URL and secret token', http, false));
    const result = await certifyNvidiaInference({ userId: 'admin-1' });
    expect(result.status).toBe(status);
    expect(JSON.stringify(result)).not.toContain('Private URL');
    expect(JSON.stringify(calls.audit.mock.calls[1]![0])).not.toContain('Private URL');
  });
});
