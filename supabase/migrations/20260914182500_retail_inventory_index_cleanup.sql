-- Remove duplicate covering index introduced after a concurrent Retail migration had already added equivalent coverage.
drop index if exists public.retail_inventory_levels_item_fk_idx;
