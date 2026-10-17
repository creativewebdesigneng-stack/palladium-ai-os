import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const network = vi.hoisted(() => vi.fn());
vi.mock('@/lib/security/public-network.server', async (original) => ({
  ...await original<typeof import('@/lib/security/public-network.server')>(),
  assertPublicNetworkEndpoint: network,
}));
import { getWebAutomationCapabilities, runWebAutomation } from '../web-intelligence.server';

const fetchMock = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  network.mockResolvedValue(undefined);
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('FIRECRAWL_API_URL', 'https://firecrawl.example/api');
  vi.stubEnv('FIRECRAWL_API_KEY', 'fixture-firecrawl-token');
  vi.stubEnv('CRAWLEE_WORKER_URL', 'https://crawlee.example/api');
  vi.stubEnv('CRAWLEE_WORKER_TOKEN', 'fixture-crawlee-token');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('Web Intelligence network boundary', () => {
  it.each(['http://[fd12::1]', 'http://[::ffff:127.0.0.1]', 'https://user:pass@example.com'])('blocks unsafe targets before provider traffic: %s', async source => {
    await expect(runWebAutomation({ provider: 'firecrawl', operation: 'scrape', source })).rejects.toThrow('public HTTP(S)');
    expect(network).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blocks public-looking target names that resolve privately before dispatch', async () => {
    network.mockRejectedValueOnce(new Error('Endpoint resolved to a private or unavailable network address.'));
    await expect(runWebAutomation({ provider: 'crawlee', operation: 'crawl', source: 'https://private.example' })).rejects.toThrow('private');
    expect(network.mock.calls[0]?.[0].hostname).toBe('private.example');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('validates provider DNS separately from the target', async () => {
    network.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('private provider'));
    await expect(runWebAutomation({ provider: 'firecrawl', operation: 'scrape', source: 'https://example.com' })).rejects.toThrow('private provider');
    expect(network.mock.calls.map(([url]) => url.hostname)).toEqual(['example.com', 'firecrawl.example']);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['http://worker.example', 'https://user:pass@worker.example', 'https://worker.example?token=secret'])('rejects insecure provider configuration: %s', async endpoint => {
    vi.stubEnv('CRAWLEE_WORKER_URL', endpoint);
    expect(getWebAutomationCapabilities().crawlee.configured).toBe(false);
    await expect(runWebAutomation({ provider: 'crawlee', operation: 'scrape', source: 'https://example.com' })).rejects.toThrow('authenticated HTTPS');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires worker authentication instead of sending anonymous requests', async () => {
    vi.stubEnv('CRAWLEE_WORKER_TOKEN', ' ');
    expect(getWebAutomationCapabilities().crawlee.configured).toBe(false);
    await expect(runWebAutomation({ provider: 'crawlee', operation: 'scrape', source: 'https://example.com' })).rejects.toThrow('authenticated HTTPS');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['firecrawl', 'crawlee'] as const)('preserves authenticated HTTPS base paths and bounded nonredirecting requests: %s', async provider => {
    fetchMock.mockResolvedValue(new Response('{"id":"job-1"}'));
    const result = await runWebAutomation({ provider, operation: 'crawl', source: 'https://example.com', limit: 100 });
    expect(result).toMatchObject({ providerJobId: 'job-1', status: 'running' });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url.href).toBe(provider === 'firecrawl' ? 'https://firecrawl.example/api/v2/crawl' : 'https://crawlee.example/api/jobs');
    expect(init).toMatchObject({ redirect: 'error', headers: { Authorization: `Bearer fixture-${provider}-token` } });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(init.body).limit).toBe(50);
  });

  it('accepts text search without treating a query as a URL', async () => {
    fetchMock.mockResolvedValue(new Response('{"data":[]}'));
    await expect(runWebAutomation({ provider: 'firecrawl', operation: 'search', source: 'browser safety' })).resolves.toMatchObject({ status: 'completed' });
    expect(network).toHaveBeenCalledTimes(1);
    expect(network.mock.calls[0]?.[0].hostname).toBe('firecrawl.example');
  });

  it.each([new Response('secret response', { status: 302, headers: { Location: 'https://private.example' } }), new Response('secret response', { status: 401 }), new Response('not-json'), new Response('[]'), new Response('x'.repeat(262145))])('rejects redirects, failures and invalid/oversized provider replies', async response => {
    fetchMock.mockResolvedValue(response);
    const error = await runWebAutomation({ provider: 'firecrawl', operation: 'search', source: 'test' }).then(() => null, error => error);
    expect(error).toBeInstanceOf(Error);
    expect(String(error)).not.toContain('secret response');
    expect(fetchMock.mock.calls[0]?.[1].redirect).toBe('error');
  });
});
