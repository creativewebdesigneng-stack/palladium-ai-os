-- Blackstar Retail: owner-scoped, one-time Twilio inbound number pairing.
-- Pairing tokens are hashed; the raw token is returned once by authenticated server code.

create table public.retail_reception_voice_pairings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  profile_id uuid not null references public.retail_reception_profiles(id) on delete cascade,
  provider text not null default 'twilio' check (provider = 'twilio'),
  provider_phone_sid text not null check (provider_phone_sid ~ '^PN[0-9A-Fa-f]{32}$'),
  token_hash text not null check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index retail_reception_voice_pairing_profile_uq
  on public.retail_reception_voice_pairings(profile_id)
  where consumed_at is null;
create index retail_reception_voice_pairings_user_idx
  on public.retail_reception_voice_pairings(user_id, expires_at desc);
create index retail_reception_voice_pairings_workspace_idx
  on public.retail_reception_voice_pairings(workspace_id, expires_at desc);
create index retail_reception_voice_pairings_phone_idx
  on public.retail_reception_voice_pairings(provider, provider_phone_sid, expires_at desc);

create trigger retail_reception_voice_pairings_set_updated_at
before update on public.retail_reception_voice_pairings
for each row execute function public.retail_set_updated_at();

alter table public.retail_reception_voice_pairings enable row level security;
alter table public.retail_reception_voice_pairings force row level security;

revoke all on table public.retail_reception_voice_pairings from public, anon, authenticated;
grant select(id, user_id, workspace_id, profile_id, provider, provider_phone_sid, expires_at, consumed_at, created_at, updated_at)
  on table public.retail_reception_voice_pairings to authenticated;
grant all on table public.retail_reception_voice_pairings to service_role;

create policy retail_reception_voice_pairings_select_own
on public.retail_reception_voice_pairings
for select to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.retail_workspaces w
    where w.id = workspace_id and w.user_id = (select auth.uid())
  )
);
