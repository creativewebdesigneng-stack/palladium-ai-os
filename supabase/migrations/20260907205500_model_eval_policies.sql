-- Restore the per-user Model Arena compliance policy table expected by
-- src/lib/evals/model-arena.functions.ts.

create table if not exists public.model_eval_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Default Model Arena policy',
  enabled boolean not null default true,
  redact_email boolean not null default true,
  redact_phone boolean not null default true,
  redact_secrets boolean not null default true,
  blocked_terms jsonb not null default '[]'::jsonb,
  apply_to_requests boolean not null default true,
  apply_to_responses boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint model_eval_policies_blocked_terms_array
    check (jsonb_typeof(blocked_terms) = 'array')
);

create index if not exists model_eval_policies_user_enabled_updated_idx
  on public.model_eval_policies (user_id, enabled, updated_at desc);

alter table public.model_eval_policies enable row level security;

revoke all on table public.model_eval_policies from anon;
grant select, insert, update, delete on table public.model_eval_policies to authenticated;

drop policy if exists "model_eval_policies_select_own" on public.model_eval_policies;
create policy "model_eval_policies_select_own"
  on public.model_eval_policies
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "model_eval_policies_insert_own" on public.model_eval_policies;
create policy "model_eval_policies_insert_own"
  on public.model_eval_policies
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "model_eval_policies_update_own" on public.model_eval_policies;
create policy "model_eval_policies_update_own"
  on public.model_eval_policies
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "model_eval_policies_delete_own" on public.model_eval_policies;
create policy "model_eval_policies_delete_own"
  on public.model_eval_policies
  for delete
  to authenticated
  using (auth.uid() = user_id);
