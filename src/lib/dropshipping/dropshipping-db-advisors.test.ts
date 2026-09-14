import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const migration=readFileSync(
  new URL('../../../supabase/migrations/20260914231000_dropshipping_production_db_advisors.sql',import.meta.url),
  'utf8',
);

describe('Dropshipping production DB advisor cleanup',()=>{
  it('keeps fulfilment evidence owner-scoped with initplan-safe auth lookup',()=>{
    expect(migration).toContain('to authenticated');
    expect(migration).toContain('using ((select auth.uid()) = user_id)');
    expect(migration).not.toContain('using (auth.uid() = user_id)');
  });

  it('indexes all Dropshipping foreign-key access paths reported by the advisor',()=>{
    expect(migration).toContain('dropshipping_fulfilment_evidence_workspace_fk_idx');
    expect(migration).toContain('on public.dropshipping_fulfilment_evidence(workspace_id)');
    expect(migration).toContain('dropshipping_fulfilment_evidence_order_fk_idx');
    expect(migration).toContain('on public.dropshipping_fulfilment_evidence(order_id)');
    expect(migration).toContain('dropshipping_opportunity_snapshots_opportunity_fk_idx');
    expect(migration).toContain('on public.dropshipping_opportunity_snapshots(opportunity_id)');
  });
});
