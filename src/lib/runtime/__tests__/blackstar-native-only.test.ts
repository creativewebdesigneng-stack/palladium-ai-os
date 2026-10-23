import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runChat, runChatPinned, streamChat } from '../model-gateway.server';
import { runChat as baseRunChat, streamChat as baseStreamChat, normaliseProvider, resolveModel, type RunArgs } from '../model-gateway.base';

const fetchMock = vi.fn();
const args = (): RunArgs => ({ provider: 'compatible', model: 'owned-test-model', messages: [{ role: 'user', content: 'Calculate 2 + 2' }], maxAttempts: 1 });
async function drain(stream: ReturnType<typeof streamChat>) { for await (const event of stream) { /* exhaust to test transport */ } }
const entries = [
  ['normal', (a: RunArgs) => runChat(a)],
  ['pinned', (a: RunArgs) => runChatPinned(a)],
  ['stream', (a: RunArgs) => drain(streamChat(a))],
  ['base', (a: RunArgs) => baseRunChat(a)],
  ['base stream', (a: RunArgs) => drain(baseStreamChat(a))],
] as const;

beforeEach(() => {
  vi.stubEnv('BLACKSTAR_NATIVE_ONLY', 'true');
  vi.stubEnv('OPENAI_COMPATIBLE_BASE_URL', 'https://owned-inference.example/v1');
  vi.stubEnv('BLACKSTAR_NATIVE_MODEL', 'owned-test-model');
  vi.stubEnv('GROQ_API_KEY', 'test-external-key');
  vi.stubEnv('OPENAI_API_KEY', 'test-external-key');
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('Blackstar-only inference deployment policy', () => {
  it.each(entries)('%s rejects an explicit external route before network access', async (_name, invoke) => {
    await expect(invoke({ ...args(), provider: 'groq' })).rejects.toThrow('only the configured compatible model');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(entries)('%s blocks legacy Groq bootstrap when endpoint configuration is missing', async (_name, invoke) => {
    vi.stubEnv('OPENAI_COMPATIBLE_BASE_URL', '');
    await expect(invoke({ ...args(), model: 'qwen/qwen3.8-27b' })).rejects.toThrow('External fallback is disabled');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(entries)('%s rejects unpinned models and incompatible run permissions', async (_name, invoke) => {
    await expect(invoke({ ...args(), model: 'different-model' })).rejects.toThrow('only the configured compatible model');
    await expect(invoke({ ...args(), allowedProviders: ['groq'] })).rejects.toThrow('provider policy');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(['file:///tmp/model', 'https://secret:password@owned.example/v1', 'https://owned.example/v1?token=private', 'invalid'])('rejects unsafe endpoint configuration without exposing it', async endpoint => {
    vi.stubEnv('OPENAI_COMPATIBLE_BASE_URL', endpoint);
    await expect(runChat(args())).rejects.toThrow('endpoint');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('does not fall back or web-rescue after a native transport failure', async () => {
    fetchMock.mockResolvedValue(new Response('unavailable', { status: 503 }));
    await expect(runChat(args())).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]![0])).toBe('https://owned-inference.example/v1/chat/completions');
  });
  it('executes the pinned model through the existing compatible transport', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: '4' } }], usage: { prompt_tokens: 3, completion_tokens: 1 } }), { status: 200 }));
    expect(await runChat({ ...args(), allowedProviders: ['compatible'] })).toMatchObject({ text: '4', provider: 'compatible', model: 'owned-test-model' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).model).toBe('owned-test-model');
    expect(fetchMock.mock.calls[0]![1].redirect).toBe('error');
  });
  it('ignores an external provider remembered before the policy was enabled', async () => {
    vi.stubEnv('BLACKSTAR_NATIVE_ONLY', 'false');
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 }));
    const request = args();
    await runChat({ ...request, provider: 'groq', model: 'openai/gpt-oss-20b' });
    fetchMock.mockClear();
    vi.stubEnv('BLACKSTAR_NATIVE_ONLY', 'true');
    expect(await runChat(request)).toMatchObject({ provider: 'compatible', model: 'owned-test-model' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]![0])).toBe('https://owned-inference.example/v1/chat/completions');
  });
  it('streams through the compatible transport with redirect refusal', async () => {
    fetchMock.mockResolvedValue(new Response('data: {"choices":[{"delta":{"content":"4"}}]}\n\ndata: [DONE]\n\n', { status: 200, headers: { 'Content-Type': 'text/event-stream' } }));
    const events = [];
    for await (const event of streamChat(args())) events.push(event);
    expect(events.some(event => event.type === 'done')).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![1].redirect).toBe('error');
  });
  it('selects the native default without hiding explicit provider choices', () => {
    expect(normaliseProvider()).toBe('compatible');
    expect(resolveModel('compatible')).toBe('owned-test-model');
    expect(normaliseProvider('groq')).toBe('groq');
  });
  it('retains explicit provider execution when the policy is disabled', async () => {
    vi.stubEnv('BLACKSTAR_NATIVE_ONLY', 'false');
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 }));
    expect(await runChatPinned({ ...args(), provider: 'groq', model: 'openai/gpt-oss-20b' })).toMatchObject({ provider: 'groq' });
  });
});
