-- Arena compliance policies are scoped to the evaluator and applied before/after
-- model execution. This complements, rather than replaces, PalladiumAI runtime tool/secret policy.
create table if not exists public.model_eval_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  enabled boolean not null default true,
  redact_email boolean not null default true,
  redact_phone boolean not null default true,
  redact_secrets boolean not null default true,
  blocked_terms text[] not null default '{}',
  apply_to_requests boolean not null default true,
  apply_to_responses boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists model_eval_policies_user_idx on public.model_eval_policies(user_id, enabled, created_at desc);
create trigger model_eval_policies_updated_at before update on public.model_eval_policies
for each row execute function public.set_updated_at();
grant select, insert, update, delete on public.model_eval_policies to authenticated;
grant all on public.model_eval_policies to service_role;
alter table public.model_eval_policies enable row level security;
create policy "model_eval_policies_owner" on public.model_eval_policies
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
