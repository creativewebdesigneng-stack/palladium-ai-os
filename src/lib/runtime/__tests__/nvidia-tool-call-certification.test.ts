import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => ({ chat: vi.fn(), audit: vi.fn() }));
vi.mock('../model-gateway.server', () => ({ runChatPinned: calls.chat }));
vi.mock('@/lib/platform/audit.server', () => ({ writeAuditRequired: calls.audit }));
import { ProviderError } from '../model-gateway.base';
import { certifyNvidiaToolCalling, nvidiaToolCallProbeEnabled,
  NVIDIA_TOOL_CALL_PROBE_EXPRESSION } from '../nvidia-inference-certification.server';

const good = () => ({
  provider: 'nvidia', model: 'openai/gpt-oss-20b', text: '',
  usage: { input: 24, output: 15 },
  toolCalls: [{ id: 'synthetic-tool-call-1', name: 'calculator',
    arguments: { expression: NVIDIA_TOOL_CALL_PROBE_EXPRESSION } }],
});

beforeEach(() => {
  calls.chat.mockReset().mockResolvedValue(good());
  calls.audit.mockReset().mockResolvedValueOnce('intent-receipt').mockResolvedValueOnce('result-receipt');
  vi.stubEnv('NVIDIA_NIM_BASE_URL', '');
  vi.stubEnv('NVIDIA_NIM_MODEL', '');
  vi.stubEnv('NVIDIA_API_KEY', 'test-private-key');
  vi.stubEnv('NVIDIA_NIM_TOOL_PROBE_ENABLED', 'true');
});
afterEach(() => vi.unstubAllEnvs());

describe('operator-initiated NVIDIA tool-call response acceptance', () => {
  it('requires an explicit independent operator switch and server-side credential', async () => {
    vi.stubEnv('NVIDIA_NIM_TOOL_PROBE_ENABLED', '');
    expect(nvidiaToolCallProbeEnabled()).toBe(false);
    expect(await certifyNvidiaToolCalling({ userId: 'admin' }))
      .toMatchObject({ status: 'not_enabled', auditReceiptId: null });
    vi.stubEnv('NVIDIA_NIM_TOOL_PROBE_ENABLED', 'true');
    vi.stubEnv('NVIDIA_API_KEY', '');
    expect(nvidiaToolCallProbeEnabled()).toBe(false);
    expect((await certifyNvidiaToolCalling({ userId: 'admin' })).status).toBe('not_enabled');
    expect(calls.chat).not.toHaveBeenCalled();
    expect(calls.audit).not.toHaveBeenCalled();
  });

  it('writes required intent first, makes one pinned bounded model request, verifies returned tool call and writes evidence', async () => {
    const output = await certifyNvidiaToolCalling({ userId: 'admin' });
    expect(output).toMatchObject({
      status: 'verified', model: 'openai/gpt-oss-20b',
      inputTokens: 24, outputTokens: 15, auditReceiptId: 'result-receipt',
    });
    expect(calls.audit).toHaveBeenCalledTimes(2);
    expect(calls.chat).toHaveBeenCalledTimes(1);
    expect(calls.audit.mock.invocationCallOrder[0]).toBeLessThan(calls.chat.mock.invocationCallOrder[0]!);
    expect(calls.audit.mock.invocationCallOrder[1]).toBeGreaterThan(calls.chat.mock.invocationCallOrder[0]!);
    expect(calls.chat).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'nvidia', model: 'openai/gpt-oss-20b',
      maxTokens: 64, maxAttempts: 1, timeoutMs: 15_000,
      allowedProviders: ['nvidia'],
      tools: [expect.objectContaining({ name: 'calculator' })],
    }));
    expect(calls.audit.mock.calls[1]![0]).toMatchObject({
      userId: 'admin', action: 'model.nvidia_tool_probe_result', status: 'success',
      metadata: { requestId: 'intent-receipt', result: 'verified', toolExecuted: false },
    });
    expect(JSON.stringify(output)).not.toContain('test-private-key');
    expect(JSON.stringify(output)).not.toContain('synthetic-tool-call-1');
  });

  it('does not spend tokens if initial audit cannot be persisted', async () => {
    calls.audit.mockReset().mockRejectedValue(new Error('private-db-error'));
    expect(await certifyNvidiaToolCalling({ userId: 'admin' }))
      .toMatchObject({ status: 'audit_unavailable', auditReceiptId: null });
    expect(calls.chat).not.toHaveBeenCalled();
  });

  it('does not call a real model result verified if outcome evidence fails', async () => {
    calls.audit.mockReset().mockResolvedValueOnce('intent').mockRejectedValueOnce(new Error('private-error'));
    expect(await certifyNvidiaToolCalling({ userId: 'admin' }))
      .toMatchObject({ status: 'audit_unavailable', auditReceiptId: null });
  });

  it.each([
    { ...good(), provider: 'groq' },
    { ...good(), model: 'wrong-model' },
    { ...good(), toolCalls: [] },
    { ...good(), toolCalls: [good().toolCalls[0], good().toolCalls[0]] },
    { ...good(), toolCalls: [{ id: '', name: 'calculator', arguments: { expression: '8 * 9' } }] },
    { ...good(), toolCalls: [{ id: 'x', name: 'browser_task', arguments: { expression: '8 * 9' } }] },
    { ...good(), toolCalls: [{ id: 'x', name: 'calculator', arguments: { expression: '9 * 9' } }] },
    { ...good(), toolCalls: [{ id: 'x', name: 'calculator', arguments: { expression: '8 * 9', url: 'https://evil.example' } }] },
    { ...good(), toolCalls: [{ id: 'x', name: 'calculator', arguments: [] }] },
  ])('rejects malformed or misrouted tool calls without claiming certification', async response => {
    calls.chat.mockResolvedValue(response);
    const output = await certifyNvidiaToolCalling({ userId: 'admin' });
    expect(output).toMatchObject({ status: 'invalid_response', auditReceiptId: 'result-receipt' });
    expect(calls.audit.mock.calls[1]![0]).toMatchObject({
      status: 'failed', metadata: { result: 'invalid_response', toolExecuted: false },
    });
  });

  it.each([
    [401, 'unauthorised'], [403, 'unauthorised'], [402, 'quota_exhausted'],
    [429, 'rate_limited'], [503, 'unavailable'],
  ] as const)('redacts upstream HTTP %i errors while classifying failure', async (code, status) => {
    calls.chat.mockRejectedValue(new ProviderError('private-token-and-hostname', code, false));
    const outcome = await certifyNvidiaToolCalling({ userId: 'admin' });
    expect(outcome.status).toBe(status);
    expect(JSON.stringify(outcome)).not.toContain('private-token-and-hostname');
    expect(JSON.stringify(calls.audit.mock.calls[1]![0])).not.toContain('private-token-and-hostname');
  });
});
