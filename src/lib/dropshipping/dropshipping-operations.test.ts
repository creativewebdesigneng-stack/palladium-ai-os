import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(new URL('../../../supabase/migrations/20260914165000_dropshipping_opportunity_operations.sql', import.meta.url), 'utf8');
const functions = readFileSync(new URL('./dropshipping-operations.functions.ts', import.meta.url), 'utf8');

describe('Dropshipping opportunity operations security', () => {
  it('keeps only dropshipping-specific intelligence in dedicated tables', () => {
    expect(migration).toContain('create table if not exists public.dropshipping_opportunities');
    expect(migration).toContain('create table if not exists public.dropshipping_opportunity_signals');
    expect(migration).toContain('create table if not exists public.dropshipping_opportunity_suppliers');
    expect(migration).toContain('create table if not exists public.dropshipping_opportunity_snapshots');
    expect(migration).toContain('references public.retail_suppliers(id)');
    expect(migration).toContain('references public.retail_catalog_items(id)');
    expect(migration).not.toContain('create table if not exists public.dropshipping_orders');
    expect(migration).not.toContain('create table if not exists public.dropshipping_catalog');
  });

  it('uses explicit authenticated owner policies and revokes anonymous table access', () => {
    for (const table of ['dropshipping_opportunities','dropshipping_opportunity_signals','dropshipping_opportunity_suppliers','dropshipping_opportunity_snapshots']) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`revoke all on table public.${table} from anon, authenticated`);
      expect(migration).toContain(`grant select, insert, update, delete on table public.${table} to authenticated`);
    }
    expect(migration).toContain('for select to authenticated using ((select auth.uid()) = user_id)');
    expect(migration).toContain('for insert to authenticated with check ((select auth.uid()) = user_id)');
    expect(migration).toContain('for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)');
    expect(migration).toContain('for delete to authenticated using ((select auth.uid()) = user_id)');
  });

  it('indexes owner filters and every dropshipping foreign-key path', () => {
    for (const index of [
      'dropshipping_opportunities_user_updated_idx',
      'dropshipping_opportunities_commerce_fk_idx',
      'dropshipping_opportunities_retail_fk_idx',
      'dropshipping_opportunities_website_fk_idx',
      'dropshipping_opportunities_catalog_fk_idx',
      'dropshipping_signals_user_idx',
      'dropshipping_signals_opportunity_observed_idx',
      'dropshipping_supplier_offers_user_idx',
      'dropshipping_supplier_offers_opportunity_idx',
      'dropshipping_supplier_offers_retail_supplier_fk_idx',
      'dropshipping_snapshots_user_idx',
      'dropshipping_snapshots_opportunity_captured_idx',
    ]) expect(migration).toContain(index);
  });

  it('persists evidence provenance without accepting embedded credentials and reuses Retail masters', () => {
    expect(functions).toContain('Store credentials in Blackstar Integrations, not dropshipping evidence.');
    expect(functions).toContain("signal_type: data.mode === 'seo' ? 'search' : 'research'");
    expect(functions).toContain("sb.from('retail_suppliers')");
    expect(functions).toContain("sb.from('retail_catalog_items')");
    expect(functions).toContain("action: 'dropshipping.research_saved'");
    expect(functions).toContain("action: 'dropshipping.opportunity_promoted'");
  });
});
