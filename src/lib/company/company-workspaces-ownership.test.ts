import { describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    let validate: (value: unknown) => unknown = (value) => value;
    const chain = {
      middleware: () => chain,
      inputValidator: (fn: (value: unknown) => unknown) => { validate = fn; return chain; },
      handler: (fn: (args: { data: unknown; context: unknown }) => unknown) =>
        ({ data, context }: { data: unknown; context: unknown }) => fn({ data: validate(data), context }),
    };
    return chain;
  },
}));
vi.mock('@/integrations/supabase/auth-middleware', () => ({ requireSupabaseAuth: () => null }));

import { deleteCompanyWorkspace, listCompanyWorkspaces, saveCompanyWorkspace } from './company-workspaces.functions';

const owner = 'user-one';
const workspaceId = '88888888-8888-4888-8888-888888888888';

function mockDatabase(data: unknown, error: unknown = null) {
  const eq = vi.fn((_column: string, _value: unknown) => query);
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq,
    order: vi.fn(() => Promise.resolve({ data, error })),
    update: vi.fn(() => query),
    delete: vi.fn(() => query),
    single: vi.fn(async () => ({ data, error })),
    maybeSingle: vi.fn(async () => ({ data, error })),
  };
  return { sb: { from: vi.fn(() => query) }, query, eq };
}

describe('owner-scoped Company Hub workspace operations', () => {
  it('lists only the authenticated owner’s records', async () => {
    const { sb, eq } = mockDatabase([{ id: workspaceId }]);
    const result = await (listCompanyWorkspaces as any)({ context: { userId: owner, supabase: sb }, data: {} });
    expect(result).toEqual([{ id: workspaceId }]);
    expect(eq).toHaveBeenCalledWith('user_id', owner);
  });

  it('scopes edits to both the exact workspace and authenticated owner', async () => {
    const { sb, eq, query } = mockDatabase({ id: workspaceId, name: 'Company A' });
    const result = await (saveCompanyWorkspace as any)({
      context: { userId: owner, supabase: sb }, data: { id: workspaceId, name: 'Company A' },
    });
    expect(result).toMatchObject({ id: workspaceId });
    expect(eq).toHaveBeenCalledWith('id', workspaceId);
    expect(eq).toHaveBeenCalledWith('user_id', owner);
    expect(query['update']).toHaveBeenCalledOnce();
  });

  it('does not report success for a workspace outside the caller’s scope', async () => {
    const { sb, eq, query } = mockDatabase(null);
    await expect((deleteCompanyWorkspace as any)({
      context: { userId: owner, supabase: sb }, data: { id: workspaceId },
    })).rejects.toThrow('not found or you do not have access');
    expect(eq).toHaveBeenCalledWith('id', workspaceId);
    expect(eq).toHaveBeenCalledWith('user_id', owner);
    expect(query['select']).toHaveBeenCalledWith('id');
  });

  it('reports a confirmed owner-scoped deletion as success and propagates database errors', async () => {
    const success = mockDatabase({ id: workspaceId });
    await expect((deleteCompanyWorkspace as any)({
      context: { userId: owner, supabase: success.sb }, data: { id: workspaceId },
    })).resolves.toEqual({ ok: true });

    const failure = mockDatabase(null, { message: 'Database unavailable' });
    await expect((deleteCompanyWorkspace as any)({
      context: { userId: owner, supabase: failure.sb }, data: { id: workspaceId },
    })).rejects.toThrow('Database unavailable');
  });
});
