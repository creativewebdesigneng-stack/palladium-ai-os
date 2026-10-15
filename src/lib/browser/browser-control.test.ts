import { describe, expect, it, vi } from 'vitest';
vi.mock('@tanstack/react-start', () => ({ createServerFn: () => {
  const chain = { middleware: () => chain, handler: (fn: unknown) => fn }; return chain;
} }));
vi.mock('@/integrations/supabase/auth-middleware', () => ({ requireSupabaseAuth: () => null }));
vi.mock('@/lib/mission/browser-agent', () => ({ browserProviderStatus: vi.fn(async () => ({ configured: false })) }));
import { getBrowserControl } from './browser.functions';
function invoke(errorTable?: string) {
  const db = { from: (table: string) => { const q: any = { select: () => q, eq: () => q, in: () => q, order: () => q,
    limit: async () => ({ data: [], error: table === errorTable ? { message: 'private backend detail' } : null }) }; return q; } };
  return (getBrowserControl as any)({ context: { userId: 'owner', supabase: db } });
}
describe('truthful browser control history', () => {
  it.each(['browser_sessions', 'tool_executions'])('reports unavailable history when %s fails', async table => {
    await expect(invoke(table)).rejects.toThrow('Could not verify your browser session and execution history.');
  });
  it('retains a verified empty history when both reads succeed', async () => {
    await expect(invoke()).resolves.toMatchObject({ sessions: [], executions: [], counts: { sessions: 0 } });
  });
});
