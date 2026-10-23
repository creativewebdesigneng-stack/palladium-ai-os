-- Astra-specific hardening of the EXISTING service-role certification function.
-- The original function is unchanged for input/output schema and privilege
-- shape. All checks fail BEFORE any verified-evidence row is inserted.
-- Not automatically applied to Production: release this migration only after
-- review and authenticated Preview acceptance of the calling application.

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
  v_verified_case_count integer;
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
    and runs.org_id is not distinct from v_organization_id
    -- The application verifies this evidence's HMAC. The database must also
    -- reject accidental service-role certification from unrelated Arena runs.
    and runs.metadata->'astra_activation'->>'server_verified' = 'true'
    and runs.metadata->'astra_activation'->>'suite_id' = p_suite_id
    and runs.metadata->'astra_activation'->>'task_class' = p_task_class
    and runs.metadata->'astra_activation'->>'provider' = p_provider
    and runs.metadata->'astra_activation'->>'model' = p_model
    and btrim(coalesce(runs.metadata->'astra_activation'->>'case_id', '')) <> ''
    and btrim(coalesce(runs.metadata->'astra_activation'->>'provenance_signature', '')) <> '';
  if v_valid_run_count<>v_sample_count then
    raise exception 'All source runs must be signed Astra cases in one exact owner, task class, model and versioned suite';
  end if;

  select count(distinct runs.metadata->'astra_activation'->>'case_id')::integer
    into v_verified_case_count
  from public.model_eval_runs runs
  where runs.id=any(v_run_ids);

  if v_verified_case_count<>v_sample_count then
    raise exception 'Each source run must represent a distinct trusted benchmark case';
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
      and scores.evaluator_type='llm_judge'
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
  -- Must remain in sync with NATIVE_INTELLIGENCE_MIN_EVAL_SCORE (0.75).
  -- This prevents an alternate service-role caller or a race from bypassing
  -- the existing application-layer signed-case quality qualification gate.
  if v_score < 0.75 then
    raise exception 'Astra evaluation score does not meet the required Native Intelligence qualification floor';
  end if;

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
