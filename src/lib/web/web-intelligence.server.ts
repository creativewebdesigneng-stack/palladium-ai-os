import { assertPublicHttpUrl } from './url-policy';

type WebOperation = 'search' | 'scrape' | 'crawl';
type WebProvider = 'firecrawl' | 'crawlee';

type RunInput = {
  provider: WebProvider;
  operation: WebOperation;
  source: string;
  limit?: number;
};

function env(name: string) {
  const value = process.env[name]?.trim();
  return value || null;
}

function cleanBase(value: string) {
  return value.replace(/\/+$/, '');
}

export function getWebAutomationCapabilities() {
  return {
    firecrawl: {
      configured: Boolean(env('FIRECRAWL_API_KEY')),
      label: 'Firecrawl',
      operations: ['search', 'scrape', 'crawl'] as WebOperation[],
    },
    crawlee: {
      configured: Boolean(env('CRAWLEE_WORKER_URL')),
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
  if (input.operation !== 'search') assertPublicHttpUrl(input.source, 'Target');
  const limit = Math.min(Math.max(Number(input.limit ?? 10), 1), 50);

  if (input.provider === 'firecrawl') {
    const apiKey = env('FIRECRAWL_API_KEY');
    if (!apiKey) throw new Error('Firecrawl is not configured. Set FIRECRAWL_API_KEY.');
    const base = cleanBase(env('FIRECRAWL_API_URL') ?? 'https://api.firecrawl.dev');
    const endpoint = `${base}/v2/${input.operation}`;
    const body = input.operation === 'search'
      ? { query: input.source, limit }
      : input.operation === 'scrape'
        ? { url: input.source, formats: ['markdown', 'links'] }
        : { url: input.source, limit, scrapeOptions: { formats: ['markdown'] } };
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) throw new Error(`Firecrawl request failed (${response.status}).`);
    const providerJobId = typeof payload['id'] === 'string' ? payload['id'] : null;
    return { providerJobId, status: providerJobId && input.operation === 'crawl' ? 'running' : 'completed', result: payload };
  }

  const workerUrl = env('CRAWLEE_WORKER_URL');
  if (!workerUrl) throw new Error('Crawlee worker is not configured. Set CRAWLEE_WORKER_URL.');
  const token = env('CRAWLEE_WORKER_TOKEN');
  const response = await fetch(`${cleanBase(workerUrl)}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ operation: input.operation, url: input.source, limit }),
  });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(`Crawlee worker rejected the job (${response.status}).`);
  const idValue = payload['id'] ?? payload['jobId'];
  const providerJobId = typeof idValue === 'string' ? idValue : null;
  if (!providerJobId) throw new Error('Crawlee worker did not return a job id.');
  return { providerJobId, status: 'running', result: payload };
}
