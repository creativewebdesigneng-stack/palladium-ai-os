-- Resolve Dropshipping-specific Supabase performance advisories without changing product behavior.

drop policy if exists dropshipping_fulfilment_evidence_owner_select
on public.dropshipping_fulfilment_evidence;

create policy dropshipping_fulfilment_evidence_owner_select
on public.dropshipping_fulfilment_evidence for select
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists dropshipping_fulfilment_evidence_workspace_fk_idx
on public.dropshipping_fulfilment_evidence(workspace_id);

create index if not exists dropshipping_fulfilment_evidence_order_fk_idx
on public.dropshipping_fulfilment_evidence(order_id);

create index if not exists dropshipping_opportunity_snapshots_opportunity_fk_idx
on public.dropshipping_opportunity_snapshots(opportunity_id);
