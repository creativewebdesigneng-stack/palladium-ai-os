import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { embedTexts, EMBEDDING_DIMENSIONS } from '../embeddings.server';

const success = () => new Response(JSON.stringify({ data: [{ index: 0, embedding: Array(EMBEDDING_DIMENSIONS).fill(0.1) }] }));
beforeEach(() => { vi.stubEnv('EMBEDDING_PROVIDER', 'openai'); vi.stubEnv('OPENAI_API_KEY', 'synthetic-test-key'); vi.useFakeTimers(); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('embedding recovery boundaries', () => {
  it.each(['insufficient_quota', 'organization_spend_limit_exceeded', 'organization_usage_limit_exceeded', 'credit_balance_exhausted'])('does not retry quota failure %s', async code => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code, message: 'private input and credential' } }), { status: 429 }));
    vi.stubGlobal('fetch', request);
    await expect(embedTexts(['synthetic'])).rejects.toMatchObject({ code: 'quota', retryable: false });
    expect(request).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('honours Retry-After before recovering within the same provider', async () => {
    const request = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 429, headers: { 'Retry-After': '2' } })).mockImplementation(success);
    vi.stubGlobal('fetch', request);
    const result = embedTexts(['synthetic']);
    await vi.advanceTimersByTimeAsync(1999);
    expect(request).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await result).toMatchObject({ provider: 'openai', model: 'text-embedding-3-small' });
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('returns immediately when Retry-After exceeds the total request budget', async () => {
    const request = vi.fn().mockResolvedValue(new Response('{}', { status: 429, headers: { 'Retry-After': '60' } }));
    vi.stubGlobal('fetch', request);
    await expect(embedTexts(['synthetic'])).rejects.toMatchObject({ code: 'rate_limit', retryable: true });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('does not sleep after the last bounded attempt', async () => {
    const request = vi.fn().mockResolvedValue(new Response('{}', { status: 503 }));
    vi.stubGlobal('fetch', request);
    const result = expect(embedTexts(['synthetic'])).rejects.toMatchObject({ code: 'provider' });
    await vi.advanceTimersByTimeAsync(1200);
    await result;
    expect(request).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cancels backoff without another provider request', async () => {
    const request = vi.fn().mockResolvedValue(new Response('{}', { status: 429 }));
    vi.stubGlobal('fetch', request);
    const controller = new AbortController();
    const result = expect(embedTexts(['synthetic'], { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    await result;
    expect(request).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each([
    [{ index: 0, embedding: [0.1] }],
    [],
    [{ index: 1, embedding: Array(1536).fill(0.1) }],
    [{ index: 0, embedding: Array(1536).fill('0.1') }],
  ].map(data => ({ data })))('rejects invalid vector dimensions, cardinality, indexes or values', async ({ data }) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data }))));
    await expect(embedTexts(['synthetic'])).rejects.toMatchObject({ code: 'provider', retryable: false });
  });
  it('never exposes provider error bodies', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: 'private input and credential' } }), { status: 400 })));
    await expect(embedTexts(['synthetic'])).rejects.toThrow('Embedding provider returned HTTP 400.');
  });
});
