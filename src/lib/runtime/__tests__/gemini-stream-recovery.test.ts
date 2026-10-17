import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RunArgs, StreamEvent } from '../model-gateway.base';
import { ProviderError } from '../model-gateway.base';

vi.mock('../gemini-provider.server', () => ({
  streamGeminiNative: vi.fn(), runGeminiNative: vi.fn(),
}));
import { streamGeminiNative, runGeminiNative } from '../gemini-provider.server';
import { streamChat, runChatPinned } from '../model-gateway.server';

const request = (): RunArgs => ({
  provider: 'gemini', model: 'gemini-2.5-flash',
  messages: [{ role: 'user', content: 'Reply QA AGENT ONLINE' }],
  tools: [], allowedProviders: ['gemini'],
});
async function collect(args = request()) {
  const events: StreamEvent[] = [];
  for await (const event of streamChat(args)) events.push(event);
  return events;
}
beforeEach(() => vi.clearAllMocks());

describe('Gemini streaming model availability recovery', () => {
  it('recovers a pre-output 404 within Gemini and records the model actually used', async () => {
    vi.mocked(streamGeminiNative).mockImplementation(async function* (args) {
      if (args.model === 'gemini-2.5-flash') throw new ProviderError('Unavailable', 404, false);
      yield { type: 'text', delta: 'QA AGENT ONLINE' };
      yield { type: 'done', result: { text: 'QA AGENT ONLINE', toolCalls: [],
        provider: 'gemini', model: args.model, usage: { input: 8, output: 4 } } };
    });
    const args = request();
    const events = await collect(args);
    expect(vi.mocked(streamGeminiNative).mock.calls.map(([a]) => a.model))
      .toEqual(['gemini-2.5-flash', 'gemini-3.6-flash']);
    expect(events).toEqual([{ type: 'text', delta: 'QA AGENT ONLINE' },
      { type: 'done', result: { text: 'QA AGENT ONLINE', toolCalls: [], provider: 'gemini',
        model: 'gemini-3.6-flash', usage: { input: 8, output: 4 } } }]);
    for (const [call] of vi.mocked(streamGeminiNative).mock.calls) {
      expect(call.provider).toBe('gemini');
      expect(call.tools).toBe(args.tools);
      expect(call.messages).toBe(args.messages);
      expect(call.allowedProviders).toEqual(['gemini']);
    }
  });
  it.each([400, 401, 403, 429, 499, 500])('does not switch models for status %s', async status => {
    const error = new ProviderError('Rejected', status, status >= 500 || status === 429);
    vi.mocked(streamGeminiNative).mockImplementation(async function* () { throw error; });
    await expect(collect()).rejects.toBe(error);
    expect(streamGeminiNative).toHaveBeenCalledTimes(1);
  });
  it.each<StreamEvent>([
    { type: 'text', delta: 'Partial response' },
    { type: 'tool_calls', toolCalls: [{ id: '1', name: 'calculator', arguments: {} }] },
  ])('does not replay a stream after emitting $type', async event => {
    const error = new ProviderError('Unavailable after output', 404, false);
    vi.mocked(streamGeminiNative).mockImplementation(async function* () { yield event; throw error; });
    const seen: StreamEvent[] = [];
    await expect((async () => { for await (const e of streamChat(request())) seen.push(e); })()).rejects.toBe(error);
    expect(seen).toEqual([event]);
    expect(streamGeminiNative).toHaveBeenCalledTimes(1);
  });
  it('stops after the existing same-provider candidates are exhausted', async () => {
    const error = new ProviderError('Unavailable', 404, false);
    vi.mocked(streamGeminiNative).mockImplementation(async function* () { throw error; });
    await expect(collect()).rejects.toBe(error);
    expect(streamGeminiNative).toHaveBeenCalledTimes(2);
  });
  it('does not start a fallback after cancellation races with a 404', async () => {
    const controller = new AbortController();
    const error = new ProviderError('Unavailable', 404, false);
    vi.mocked(streamGeminiNative).mockImplementation(async function* () {
      controller.abort();
      throw error;
    });
    await expect(collect({ ...request(), signal: controller.signal })).rejects.toBe(error);
    expect(streamGeminiNative).toHaveBeenCalledTimes(1);
  });
  it('preserves an available explicitly selected model', async () => {
    vi.mocked(streamGeminiNative).mockImplementation(async function* (args) {
      yield { type: 'done', result: { provider: 'gemini', model: args.model,
        text: 'OK', toolCalls: [], usage: { input: 1, output: 1 } } };
    });
    expect((await collect()).at(-1)).toMatchObject({ result: { model: 'gemini-2.5-flash' } });
    expect(streamGeminiNative).toHaveBeenCalledTimes(1);
  });
  it('keeps pinned evaluation failures exact rather than substituting a model', async () => {
    const error = new ProviderError('Unavailable', 404, false);
    vi.mocked(runGeminiNative).mockRejectedValue(error);
    await expect(runChatPinned(request())).rejects.toBe(error);
    expect(runGeminiNative).toHaveBeenCalledTimes(1);
    expect(runGeminiNative).toHaveBeenCalledWith(expect.objectContaining({ model: 'gemini-2.5-flash' }));
    expect(streamGeminiNative).not.toHaveBeenCalled();
  });
});
