import { assertPublicHttpUrl } from './url-policy';
import { assertPublicNetworkEndpoint } from '@/lib/security/public-network.server';
import { providerEndpoint, requestProviderJson } from '@/lib/security/provider-http.server';

type WebOperation = 'search' | 'scrape' | 'crawl';
type WebProvider = 'firecrawl' | 'crawlee';

type RunInput = {
  provider: WebProvider;
  operation: WebOperation;
  source: string;
  limit?: number | undefined;
};

function env(name: string) {
  const value = process.env[name]?.trim();
  return value || null;
}

function connection(provider: WebProvider) {
  const endpoint = providerEndpoint(provider === 'firecrawl'
    ? env('FIRECRAWL_API_URL') ?? 'https://api.firecrawl.dev'
    : env('CRAWLEE_WORKER_URL') ?? undefined);
  const token = env(provider === 'firecrawl' ? 'FIRECRAWL_API_KEY' : 'CRAWLEE_WORKER_TOKEN');
  return endpoint && token ? { endpoint, token } : null;
}

export function getWebAutomationCapabilities() {
  return {
    firecrawl: {
      configured: Boolean(connection('firecrawl')),
      label: 'Firecrawl',
      operations: ['search', 'scrape', 'crawl'] as WebOperation[],
    },
    crawlee: {
      configured: Boolean(connection('crawlee')),
      label: 'Crawlee worker',
      operations: ['scrape', 'crawl'] as WebOperation[],
    },
    browserUse: {
      configured: Boolean(env('BROWSER_USE_API_URL') && env('BROWSER_USE_API_KEY')),
      label: 'Browser Use',
    },
    openHands: {
      configured: Boolean(env('OPENHANDS_SERVER_URL')),
      label: 'OpenHands',
    },
  };
}

export async function runWebAutomation(input: RunInput) {
  if (input.provider !== 'firecrawl' && input.provider !== 'crawlee') throw new Error('Unsupported web provider.');
  if (!['search', 'scrape', 'crawl'].includes(input.operation) || (input.provider === 'crawlee' && input.operation === 'search')) throw new Error('Unsupported web operation.');
  const config = connection(input.provider);
  if (!config) throw new Error('An authenticated HTTPS web provider connection is required.');
  if (input.operation !== 'search') {
    assertPublicHttpUrl(input.source, 'Target');
    await assertPublicNetworkEndpoint(new URL(input.source));
  }
  const limit = Math.min(Math.max(Number(input.limit ?? 10), 1), 50);

  if (input.provider === 'firecrawl') {
    const endpoint = new URL(`${config.endpoint.href.replace(/\/+$/, '')}/v2/${input.operation}`);
    const body = input.operation === 'search'
      ? { query: input.source, limit }
      : input.operation === 'scrape'
        ? { url: input.source, formats: ['markdown', 'links'] }
        : { url: input.source, limit, scrapeOptions: { formats: ['markdown'] } };
    const payload = await requestProviderJson(endpoint, config.token, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const providerJobId = typeof payload['id'] === 'string' ? payload['id'] : null;
    return { providerJobId, status: providerJobId && input.operation === 'crawl' ? 'running' : 'completed', result: payload };
  }

  const payload = await requestProviderJson(new URL(`${config.endpoint.href.replace(/\/+$/, '')}/jobs`), config.token, {
    method: 'POST',
    body: JSON.stringify({ operation: input.operation, url: input.source, limit }),
  });
  const idValue = payload['id'] ?? payload['jobId'];
  const providerJobId = typeof idValue === 'string' ? idValue : null;
  if (!providerJobId) throw new Error('Crawlee worker did not return a job id.');
  return { providerJobId, status: 'running', result: payload };
}
