-- Reconcile the Model Arena + verified evidence foundation for drifted production
-- databases. Reuses the existing evaluation architecture; no duplicate evaluator.

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
  score numeric(8,4) not null check (score >= 0 and score <= 100),
  verdict text,
  reasoning text,
  criteria jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

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
  constraint model_eval_policies_blocked_terms_array check (jsonb_typeof(blocked_terms) = 'array')
);

create table if not exists public.model_eval_verified_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid null references public.organisations(id) on delete cascade,
  model_id text not null check (char_length(btrim(model_id)) between 1 and 200),
  provider text not null check (char_length(btrim(provider)) between 1 and 100),
  model text not null check (char_length(btrim(model)) between 1 and 200),
  suite_id text not null check (char_length(btrim(suite_id)) between 1 and 200),
  task_class text not null check (task_class in ('general','reasoning','coding','tool_use','vision','agentic')),
  score numeric(9,8) not null check (score >= 0 and score <= 1),
  sample_count integer not null check (sample_count >= 20),
  benchmark_hash text not null check (benchmark_hash ~ '^[a-f0-9]{64}$'),
  evaluator_hash text not null check (evaluator_hash ~ '^[a-f0-9]{64}$'),
  model_config_hash text not null check (model_config_hash ~ '^[a-f0-9]{64}$'),
  verifier text not null check (char_length(btrim(verifier)) between 1 and 100),
  completed_at timestamptz not null,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.model_eval_verified_evidence_runs (
  evidence_id uuid not null references public.model_eval_verified_evidence(id) on delete cascade,
  run_id uuid not null references public.model_eval_runs(id) on delete restrict,
  primary key (evidence_id, run_id)
);

create index if not exists model_eval_runs_user_idx on public.model_eval_runs(user_id, created_at desc);
create index if not exists model_eval_runs_org_idx on public.model_eval_runs(org_id, created_at desc) where org_id is not null;
create index if not exists model_eval_responses_run_idx on public.model_eval_responses(run_id, created_at);
create index if not exists model_eval_scores_run_idx on public.model_eval_scores(run_id, score desc);
create index if not exists model_eval_scores_response_idx on public.model_eval_scores(response_id);
create index if not exists model_eval_policies_user_enabled_updated_idx on public.model_eval_policies(user_id, enabled, updated_at desc);
create index if not exists model_eval_verified_evidence_scope_idx on public.model_eval_verified_evidence(user_id, organization_id, task_class, model_id, verified_at desc);
create index if not exists model_eval_verified_evidence_org_idx on public.model_eval_verified_evidence(organization_id) where organization_id is not null;
create index if not exists model_eval_verified_evidence_runs_run_idx on public.model_eval_verified_evidence_runs(run_id);
create unique index if not exists model_eval_verified_evidence_fingerprint_idx on public.model_eval_verified_evidence (
  user_id,
  coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid),
  model_id, suite_id, task_class, benchmark_hash, evaluator_hash, model_config_hash
);

alter table public.model_eval_runs enable row level security;
alter table public.model_eval_responses enable row level security;
alter table public.model_eval_scores enable row level security;
alter table public.model_eval_policies enable row level security;
alter table public.model_eval_verified_evidence enable row level security;
alter table public.model_eval_verified_evidence_runs enable row level security;

revoke all on public.model_eval_runs, public.model_eval_responses, public.model_eval_scores, public.model_eval_policies from public, anon;
grant select,insert,update,delete on public.model_eval_runs, public.model_eval_responses, public.model_eval_scores, public.model_eval_policies to authenticated;
grant all on public.model_eval_runs, public.model_eval_responses, public.model_eval_scores, public.model_eval_policies to service_role;
revoke all on public.model_eval_verified_evidence, public.model_eval_verified_evidence_runs from public, anon, authenticated;
grant select on public.model_eval_verified_evidence, public.model_eval_verified_evidence_runs to authenticated;
grant all on public.model_eval_verified_evidence, public.model_eval_verified_evidence_runs to service_role;

drop policy if exists model_eval_runs_scope on public.model_eval_runs;
create policy model_eval_runs_scope on public.model_eval_runs for all to authenticated
using (
  (org_id is null and user_id=(select auth.uid()))
  or (org_id is not null and exists (
    select 1 from public.organisation_members om
    where om.org_id=model_eval_runs.org_id and om.user_id=(select auth.uid())
  ))
)
with check (
  user_id=(select auth.uid()) and (
    org_id is null or exists (
      select 1 from public.organisation_members om
      where om.org_id=model_eval_runs.org_id and om.user_id=(select auth.uid())
    )
  )
);

drop policy if exists model_eval_responses_scope on public.model_eval_responses;
create policy model_eval_responses_scope on public.model_eval_responses for all to authenticated
using (exists (
  select 1 from public.model_eval_runs r
  where r.id=model_eval_responses.run_id and (
    (r.org_id is null and r.user_id=(select auth.uid()))
    or (r.org_id is not null and exists (
      select 1 from public.organisation_members om
      where om.org_id=r.org_id and om.user_id=(select auth.uid())
    ))
  )
))
with check (exists (
  select 1 from public.model_eval_runs r
  where r.id=model_eval_responses.run_id and (
    (r.org_id is null and r.user_id=(select auth.uid()))
    or (r.org_id is not null and exists (
      select 1 from public.organisation_members om
      where om.org_id=r.org_id and om.user_id=(select auth.uid())
    ))
  )
));

drop policy if exists model_eval_scores_scope on public.model_eval_scores;
create policy model_eval_scores_scope on public.model_eval_scores for all to authenticated
using (exists (
  select 1 from public.model_eval_runs r
  where r.id=model_eval_scores.run_id and (
    (r.org_id is null and r.user_id=(select auth.uid()))
    or (r.org_id is not null and exists (
      select 1 from public.organisation_members om
      where om.org_id=r.org_id and om.user_id=(select auth.uid())
    ))
  )
))
with check (exists (
  select 1 from public.model_eval_runs r
  where r.id=model_eval_scores.run_id and (
    (r.org_id is null and r.user_id=(select auth.uid()))
    or (r.org_id is not null and exists (
      select 1 from public.organisation_members om
      where om.org_id=r.org_id and om.user_id=(select auth.uid())
    ))
  )
));

drop policy if exists model_eval_policies_owner on public.model_eval_policies;
drop policy if exists model_eval_policies_select_own on public.model_eval_policies;
drop policy if exists model_eval_policies_insert_own on public.model_eval_policies;
drop policy if exists model_eval_policies_update_own on public.model_eval_policies;
drop policy if exists model_eval_policies_delete_own on public.model_eval_policies;
create policy model_eval_policies_owner on public.model_eval_policies for all to authenticated
using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

drop policy if exists model_eval_verified_evidence_select on public.model_eval_verified_evidence;
create policy model_eval_verified_evidence_select on public.model_eval_verified_evidence for select to authenticated
using (
  user_id=(select auth.uid())
  or (
    organization_id is not null and exists (
      select 1 from public.organisation_members membership
      where membership.org_id=model_eval_verified_evidence.organization_id
        and membership.user_id=(select auth.uid())
    )
  )
);

drop policy if exists model_eval_verified_evidence_runs_select on public.model_eval_verified_evidence_runs;
create policy model_eval_verified_evidence_runs_select on public.model_eval_verified_evidence_runs for select to authenticated
using (exists (
  select 1 from public.model_eval_verified_evidence evidence
  where evidence.id=evidence_id
));

create or replace function public.certify_native_intelligence_model_evaluation(
  p_run_ids uuid[],
  p_model_id text,
  p_provider text,
  p_model text,
  p_suite_id text,
  p_task_class text,
  p_benchmark_hash text,
  p_evaluator_hash text,
  p_model_config_hash text,
  p_verifier text
)
returns public.model_eval_verified_evidence
language plpgsql
security definer
set search_path=public
as $$
declare
  v_run_ids uuid[];
  v_sample_count integer;
  v_valid_run_count integer;
  v_scored_run_count integer;
  v_user_id uuid;
  v_organization_id uuid;
  v_score numeric;
  v_completed_at timestamptz;
  v_evidence public.model_eval_verified_evidence;
begin
  if p_task_class not in ('general','reasoning','coding','tool_use','vision','agentic') then
    raise exception 'Unsupported Native Intelligence task class';
  end if;
  if btrim(coalesce(p_model_id,''))='' or btrim(coalesce(p_provider,''))=''
    or btrim(coalesce(p_model,''))='' or btrim(coalesce(p_suite_id,''))=''
    or btrim(coalesce(p_verifier,''))='' then
    raise exception 'Model, suite, and verifier identifiers are required';
  end if;
  if p_benchmark_hash !~ '^[a-f0-9]{64}$'
    or p_evaluator_hash !~ '^[a-f0-9]{64}$'
    or p_model_config_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Reproducibility hashes must be lowercase SHA-256 hex digests';
  end if;

  select array_agg(run_id order by run_id) into v_run_ids
  from (
    select distinct run_id
    from unnest(coalesce(p_run_ids,'{}'::uuid[])) supplied(run_id)
    where run_id is not null
  ) deduplicated;

  v_sample_count := coalesce(cardinality(v_run_ids),0);
  if v_sample_count < 20 then raise exception 'At least 20 distinct completed Model Arena runs are required'; end if;

  select runs.user_id,runs.org_id into v_user_id,v_organization_id
  from public.model_eval_runs runs where runs.id=v_run_ids[1];
  if v_user_id is null then raise exception 'Model Arena run not found'; end if;

  select count(*)::integer into v_valid_run_count
  from public.model_eval_runs runs
  where runs.id=any(v_run_ids)
    and runs.status='completed'
    and runs.completed_at is not null
    and runs.user_id=v_user_id
    and runs.org_id is not distinct from v_organization_id;
  if v_valid_run_count<>v_sample_count then
    raise exception 'All source runs must be completed and belong to one exact owner/organization scope';
  end if;

  with per_run as (
    select runs.id as run_id,
           avg(scores.score)::numeric / 100 as normalized_score,
           runs.completed_at
    from public.model_eval_runs runs
    join public.model_eval_responses responses
      on responses.run_id=runs.id and responses.provider=p_provider and responses.model=p_model
    join public.model_eval_scores scores
      on scores.run_id=runs.id and scores.response_id=responses.id
    where runs.id=any(v_run_ids)
    group by runs.id,runs.completed_at
  )
  select count(*)::integer,avg(per_run.normalized_score),max(per_run.completed_at)
  into v_scored_run_count,v_score,v_completed_at
  from per_run;

  if v_scored_run_count<>v_sample_count then
    raise exception 'Every source run must contain a successful scored response for the exact provider/model';
  end if;
  if v_score is null or v_score<0 or v_score>1 then raise exception 'Computed evaluation score is invalid'; end if;

  insert into public.model_eval_verified_evidence(
    user_id,organization_id,model_id,provider,model,suite_id,task_class,score,sample_count,
    benchmark_hash,evaluator_hash,model_config_hash,verifier,completed_at
  ) values (
    v_user_id,v_organization_id,left(btrim(p_model_id),200),left(btrim(p_provider),100),
    left(btrim(p_model),200),left(btrim(p_suite_id),200),p_task_class,round(v_score,8),
    v_sample_count,p_benchmark_hash,p_evaluator_hash,p_model_config_hash,left(btrim(p_verifier),100),v_completed_at
  ) returning * into v_evidence;

  insert into public.model_eval_verified_evidence_runs(evidence_id,run_id)
  select v_evidence.id,run_id from unnest(v_run_ids) source_runs(run_id);
  return v_evidence;
end;
$$;

revoke all on function public.certify_native_intelligence_model_evaluation(
  uuid[],text,text,text,text,text,text,text,text,text
) from public,anon,authenticated;
grant execute on function public.certify_native_intelligence_model_evaluation(
  uuid[],text,text,text,text,text,text,text,text,text
) to service_role;

comment on table public.model_eval_verified_evidence is
  'Verifier-controlled aggregate Model Arena evidence safe for provider-neutral Native Intelligence routing.';
comment on function public.certify_native_intelligence_model_evaluation(
  uuid[],text,text,text,text,text,text,text,text,text
) is
  'Service-role-only certification of >=20 completed same-scope Model Arena runs; 0-100 judge scores are normalized to 0-1 exactly once.';
