-- Native model evaluation arena inspired by Sarus Arena.
-- Reuses PalladiumAI's model gateway; stores evaluation evidence and judge results.

create table if not exists public.model_eval_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organisations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  prompt text not null,
  evaluation_mode text not null default 'llm_judge' check (evaluation_mode in ('ab','user_feedback','formula','llm_judge')),
  status text not null default 'running' check (status in ('running','completed','failed')),
  judge_provider text,
  judge_model text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.model_eval_responses (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.model_eval_runs(id) on delete cascade,
  provider text not null,
  model text not null,
  label text,
  response_text text not null,
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.model_eval_scores (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.model_eval_runs(id) on delete cascade,
  response_id uuid not null references public.model_eval_responses(id) on delete cascade,
  evaluator_type text not null check (evaluator_type in ('user','formula','llm_judge')),
  score numeric(8,4) not null,
  verdict text,
  reasoning text,
  criteria jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists model_eval_runs_user_idx on public.model_eval_runs(user_id, created_at desc);
create index if not exists model_eval_runs_org_idx on public.model_eval_runs(org_id, created_at desc) where org_id is not null;
create index if not exists model_eval_responses_run_idx on public.model_eval_responses(run_id, created_at);
create index if not exists model_eval_scores_run_idx on public.model_eval_scores(run_id, score desc);

grant select, insert, update, delete on public.model_eval_runs, public.model_eval_responses, public.model_eval_scores to authenticated;
grant all on public.model_eval_runs, public.model_eval_responses, public.model_eval_scores to service_role;
alter table public.model_eval_runs enable row level security;
alter table public.model_eval_responses enable row level security;
alter table public.model_eval_scores enable row level security;

create policy "model_eval_runs_scope" on public.model_eval_runs
for all to authenticated
using (
  (org_id is null and user_id = auth.uid()) or
  (org_id is not null and exists (select 1 from public.organisation_members om where om.org_id = model_eval_runs.org_id and om.user_id = auth.uid()))
)
with check (
  user_id = auth.uid() and (
    org_id is null or exists (select 1 from public.organisation_members om where om.org_id = model_eval_runs.org_id and om.user_id = auth.uid())
  )
);

create policy "model_eval_responses_scope" on public.model_eval_responses
for all to authenticated
using (exists (
  select 1 from public.model_eval_runs r where r.id = model_eval_responses.run_id and
  ((r.org_id is null and r.user_id = auth.uid()) or (r.org_id is not null and exists (select 1 from public.organisation_members om where om.org_id = r.org_id and om.user_id = auth.uid())))
))
with check (exists (
  select 1 from public.model_eval_runs r where r.id = model_eval_responses.run_id and
  ((r.org_id is null and r.user_id = auth.uid()) or (r.org_id is not null and exists (select 1 from public.organisation_members om where om.org_id = r.org_id and om.user_id = auth.uid())))
));

create policy "model_eval_scores_scope" on public.model_eval_scores
for all to authenticated
using (exists (
  select 1 from public.model_eval_runs r where r.id = model_eval_scores.run_id and
  ((r.org_id is null and r.user_id = auth.uid()) or (r.org_id is not null and exists (select 1 from public.organisation_members om where om.org_id = r.org_id and om.user_id = auth.uid())))
))
with check (exists (
  select 1 from public.model_eval_runs r where r.id = model_eval_scores.run_id and
  ((r.org_id is null and r.user_id = auth.uid()) or (r.org_id is not null and exists (select 1 from public.organisation_members om where om.org_id = r.org_id and om.user_id = auth.uid())))
));
