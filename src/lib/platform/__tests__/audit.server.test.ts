import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ single: vi.fn(), insert: vi.fn() }));
vi.mock('@/integrations/supabase/client.server', () => ({
  supabaseAdmin: { from: () => ({ insert: mocks.insert }) },
}));
import { writeAuditRequired, writeAudit } from '../audit.server';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.insert.mockReturnValue({ select: () => ({ single: mocks.single }) });
});
describe('confirmed audit persistence', () => {
  it('requires a returned persisted row and preserves the authenticated owner', async () => {
    mocks.single.mockResolvedValue({ data: { id: 'audit-id' }, error: null });
    await expect(writeAuditRequired({ userId: 'owner', action: 'archive-import' })).resolves.toBe('audit-id');
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({user_id:'owner',action:'archive-import'}));
  });
  it('rejects returned database errors without disclosing database details', async () => {
    mocks.single.mockResolvedValue({ data: null, error: { message: 'private-database-detail' } });
    await expect(writeAuditRequired({ userId: 'owner', action: 'archive-import' }))
      .rejects.toThrow('Required audit entry could not be persisted');
  });
  it('rejects a response without persistence evidence', async () => {
    mocks.single.mockResolvedValue({ data: null, error: null });
    await expect(writeAuditRequired({ userId: 'owner', action: 'archive-import' })).rejects.toThrow(/could not be persisted/);
  });
  it('keeps existing best-effort callers nonblocking while reporting failed writes', async () => {
    mocks.single.mockResolvedValue({ data: null, error: { message: 'failed' } });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(writeAudit({ userId: 'owner', action: 'existing-operation' })).resolves.toBeUndefined();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
