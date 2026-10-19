import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeSupabase } from './fake-supabase';

const browser = vi.hoisted(() => ({
  create: vi.fn(), search: vi.fn(), compare: vi.fn(), close: vi.fn(),
}));
vi.mock('@/integrations/supabase/client.server', () => ({
  supabaseAdmin: createFakeSupabase(),
}));
vi.mock('@/lib/mission/browser-agent', () => ({
  createBrowserTool: browser.create,
  resolveBrowserProvider: () => 'playwright',
  isDomainAllowed: () => true,
}));
import { executeTool } from '../tools.server';

function run(input: Record<string, unknown>, allowedDomains = ['retailer.example']) {
  const sb = createFakeSupabase({ tool_executions: [] });
  return executeTool('shopping_search', input, {
    sb, userId: 'owner', orgId: null, agentId: 'agent', taskId: 'task',
  }, new Map([['shopping_search', {
    slug: 'shopping_search', requiresApproval: false, allowedDomains, spendCap: 100,
  }]])).then(result => ({ result, sb }));
}

describe('shopping search provider evidence is truthful', () => {
  beforeEach(() => {
    browser.create.mockReset();
    browser.search.mockReset();
    browser.compare.mockReset();
    browser.close.mockReset();
    browser.close.mockResolvedValue(undefined);
    browser.create.mockReturnValue({
      provider: 'fixture', kind: 'development',
      search: browser.search, compare: browser.compare, close: browser.close,
    });
  });

  it('refuses development provider offers and records failure without a provider search', async () => {
    const { result, sb } = await run({ requirement: 'replacement cycling helmet', budget: 75 });
    expect(result).toMatchObject({
      ok: false, output: {
        error: expect.stringContaining('Live retailer search is not configured'),
        simulated: true,
      },
    });
    expect(sb.tables['tool_executions']?.[0]?.['status']).toBe('failed');
    expect(browser.search).not.toHaveBeenCalled();
    expect(browser.close).toHaveBeenCalledTimes(1);
  });

  it('rejects empty domain scopes before instantiating a browsing provider', async () => {
    const { result } = await run({ requirement: 'replacement cycling helmet' }, []);
    expect(result).toMatchObject({
      ok: false, output: { error: expect.stringContaining('allow-list') },
    });
    expect(browser.create).not.toHaveBeenCalled();
  });

  it('returns a real-provider result with explicit non-simulation flag, never authorising purchase', async () => {
    browser.create.mockReturnValue({
      provider: 'playwright', kind: 'remote',
      search: browser.search, compare: browser.compare, close: browser.close,
    });
    browser.search.mockResolvedValue([{ title: 'Item', price: 50 }]);
    browser.compare.mockResolvedValue([{ title: 'Item', price: 50 }]);
    const { result, sb } = await run({ requirement: 'replacement cycling helmet', budget: 75 });
    expect(result).toMatchObject({
      ok: true, output: {
        provider: 'playwright', simulated: false,
        offers: [{ title: 'Item', price: 50 }],
      },
    });
    expect(sb.tables['tool_executions']?.[0]?.['status']).toBe('succeeded');
    expect(browser.search).toHaveBeenCalledTimes(1);
    expect(browser.close).toHaveBeenCalledTimes(1);
  });
});
