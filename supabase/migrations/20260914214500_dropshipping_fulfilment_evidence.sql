create table if not exists public.dropshipping_fulfilment_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  order_id uuid not null references public.retail_orders(id) on delete cascade,
  provider text not null,
  action text not null,
  transport text,
  result jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  reconciled_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.dropshipping_fulfilment_evidence enable row level security;

drop policy if exists dropshipping_fulfilment_evidence_owner_select on public.dropshipping_fulfilment_evidence;
create policy dropshipping_fulfilment_evidence_owner_select
on public.dropshipping_fulfilment_evidence for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists dropshipping_fulfilment_evidence_owner_insert on public.dropshipping_fulfilment_evidence;
create policy dropshipping_fulfilment_evidence_owner_insert
on public.dropshipping_fulfilment_evidence for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists dropshipping_fulfilment_evidence_owner_update on public.dropshipping_fulfilment_evidence;
create policy dropshipping_fulfilment_evidence_owner_update
on public.dropshipping_fulfilment_evidence for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

revoke all on public.dropshipping_fulfilment_evidence from anon;
grant select, insert, update on public.dropshipping_fulfilment_evidence to authenticated;

create index if not exists dropshipping_fulfilment_evidence_owner_order_idx
on public.dropshipping_fulfilment_evidence(user_id, order_id, observed_at desc);
