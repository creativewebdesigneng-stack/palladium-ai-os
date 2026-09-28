import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const migration=readFileSync('supabase/migrations/20260928185000_retail_return_line_restock.sql','utf8');
const functions=readFileSync(new URL('./retail-service-automation.functions.ts',import.meta.url),'utf8');
const panel=readFileSync(new URL('../../components/retail/RetailReturnRestocking.jsx',import.meta.url),'utf8');
const shell=readFileSync(new URL('../../components/retail/RetailServiceAutomation.jsx',import.meta.url),'utf8');

describe('Retail atomic return restocking',()=>{
  it('keeps processed fields executor-owned under forced RLS',()=>{
    expect(migration).toContain('alter table public.retail_return_items force row level security');
    expect(migration).toContain('grant update(item_id, location_id, quantity, condition, disposition, notes, updated_at)');
    expect(migration).not.toContain('grant update(processed_quantity');
    expect(functions).toContain(".eq('processed_quantity', 0)");
  });

  it('restocks only received/refunded sellable restock lines with a real location',()=>{
    expect(migration).toContain("v_return.status not in ('received','refunded')");
    expect(migration).toContain("ri.disposition = 'restock'");
    expect(migration).toContain("ri.condition = 'sellable'");
    expect(migration).toContain('restock_location_required_for_item');
  });

  it('writes inventory and its movement ledger in the same database function',()=>{
    expect(migration).toContain('insert into public.retail_inventory_levels');
    expect(migration).toContain('insert into public.retail_inventory_movements');
    expect(migration).toContain("movement_type, quantity");
    expect(migration).toContain("'return', v_quantity");
    expect(migration).toContain('set processed_quantity = quantity');
  });

  it('exposes the current Retail automation data and UI without reviving old receptionist schemas',()=>{
    expect(functions).toContain("from('retail_returns')");
    expect(functions).toContain("from('retail_return_items')");
    expect(functions).toContain("sb.rpc('retail_process_return_restock'");
    expect(shell).toContain("['returns','Return restocking',RotateCcw]");
    expect(panel).toContain('Atomic restock processing');
    expect(migration).not.toContain('retail_receptionist_profiles');
  });
});
