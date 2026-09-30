import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const migration=readFileSync(
  new URL('../../../supabase/migrations/20260930220000_dropshipping_multi_supplier_evidence.sql',import.meta.url),
  'utf8',
);

describe('Dropshipping multi-supplier evidence migration',()=>{
  it('keeps Retail as the supplier master without restoring the stale signal pipeline',()=>{
    expect(migration).toContain('references public.retail_suppliers(id)');
    expect(migration).toContain('references public.dropshipping_opportunities(id)');
    expect(migration).not.toContain('create table if not exists public.dropshipping_opportunity_signals');
  });

  it('owner-scopes the supplier evidence table and explicitly denies anon access',()=>{
    expect(migration).toContain('alter table public.dropshipping_opportunity_suppliers enable row level security');
    expect(migration).toContain('to authenticated');
    expect(migration).toContain('user_id = (select auth.uid())');
    expect(migration).toContain('revoke all on public.dropshipping_opportunity_suppliers from anon');
    expect(migration).toContain('grant select, insert, update, delete on public.dropshipping_opportunity_suppliers to authenticated');
  });

  it('requires opportunity and Retail supplier workspace compatibility',()=>{
    expect(migration).toContain('join public.retail_suppliers supplier on supplier.id = retail_supplier_id');
    expect(migration).toContain('(opportunity.workspace_id is null or supplier.workspace_id = opportunity.workspace_id)');
  });

  it('stores supplier evidence in the existing snapshot history and blocks obvious credential assignments',()=>{
    expect(migration).toContain('add column if not exists supplier_summary jsonb');
    expect(migration).toContain('access[_-]?token');
    expect(migration).toContain('password');
    expect(migration).toContain('authorization');
  });
});
