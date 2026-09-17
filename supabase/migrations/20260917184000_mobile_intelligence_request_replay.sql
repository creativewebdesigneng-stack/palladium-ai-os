create table if not exists public.mobile_intelligence_request_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null references public.mobile_intelligence_devices(id) on delete cascade,
  request_id text not null check (char_length(request_id) between 1 and 128),
  received_at timestamptz not null default now(),
  primary key (device_id, request_id)
);

alter table public.mobile_intelligence_request_receipts enable row level security;
create policy "mobile receipts owner read" on public.mobile_intelligence_request_receipts
  for select to authenticated using (auth.uid() = user_id);
create policy "mobile receipts owner insert" on public.mobile_intelligence_request_receipts
  for insert to authenticated with check (auth.uid() = user_id);

revoke all on table public.mobile_intelligence_request_receipts from anon;
grant select, insert on table public.mobile_intelligence_request_receipts to authenticated;
