alter table public.website_studio_projects
  add column if not exists form_deployment_tokens jsonb not null default '{}'::jsonb;

alter table public.website_studio_projects
  drop constraint if exists website_studio_projects_form_deployment_tokens_object;

alter table public.website_studio_projects
  add constraint website_studio_projects_form_deployment_tokens_object
  check (jsonb_typeof(form_deployment_tokens) = 'object');

create or replace function public.website_studio_stage_form_deployment_token(
  p_project_id uuid,
  p_target text,
  p_token_hash text,
  p_staging_ref text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_target text := trim(coalesce(p_target, ''));
  v_staging_ref text := trim(coalesce(p_staging_ref, ''));
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if v_target !~ '^(vercel:(preview|production)|github:[0-9a-f]{64})$'
     or p_token_hash is null
     or p_token_hash !~ '^[0-9a-f]{64}$'
     or char_length(v_staging_ref) not between 1 and 300 then
    raise exception 'invalid form deployment token parameters' using errcode = '22023';
  end if;

  update public.website_studio_projects p
     set form_deployment_tokens = jsonb_set(
       coalesce(p.form_deployment_tokens, '{}'::jsonb),
       array[v_target],
       (
         coalesce(p.form_deployment_tokens -> v_target, '{}'::jsonb)
         - 'pending_hash' - 'pending_ref' - 'pending_at'
       ) || jsonb_build_object(
         'pending_hash', p_token_hash,
         'pending_ref', v_staging_ref,
         'pending_at', now()
       ),
       true
     ),
     updated_at = now()
   where p.id = p_project_id
     and p.user_id = v_user_id;

  if not found then
    raise exception 'Website Studio project not found' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.website_studio_promote_form_deployment_token(
  p_project_id uuid,
  p_target text,
  p_staging_ref text,
  p_active_ref text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_target text := trim(coalesce(p_target, ''));
  v_staging_ref text := trim(coalesce(p_staging_ref, ''));
  v_active_ref text := trim(coalesce(p_active_ref, ''));
  v_tokens jsonb;
  v_slot jsonb;
  v_pending_hash text;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if v_target !~ '^(vercel:(preview|production)|github:[0-9a-f]{64})$'
     or char_length(v_staging_ref) not between 1 and 300
     or char_length(v_active_ref) not between 1 and 300 then
    raise exception 'invalid form deployment token parameters' using errcode = '22023';
  end if;

  select p.form_deployment_tokens
    into v_tokens
    from public.website_studio_projects p
   where p.id = p_project_id
     and p.user_id = v_user_id
   for update;

  if not found then
    raise exception 'Website Studio project not found' using errcode = '42501';
  end if;

  v_tokens := coalesce(v_tokens, '{}'::jsonb);
  v_slot := coalesce(v_tokens -> v_target, '{}'::jsonb);
  if coalesce(v_slot ->> 'pending_ref', '') <> v_staging_ref then
    raise exception 'staged deployment token does not match this deployment' using errcode = '22023';
  end if;

  v_pending_hash := v_slot ->> 'pending_hash';
  if v_pending_hash is null or v_pending_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'no staged deployment token exists' using errcode = '22023';
  end if;

  if v_target like 'github:%' then
    select coalesce(jsonb_object_agg(entry.key, entry.value), '{}'::jsonb)
      into v_tokens
      from jsonb_each(v_tokens) as entry(key, value)
     where entry.key not like 'github:%'
        or entry.key = v_target;
  end if;

  update public.website_studio_projects p
     set form_deployment_tokens = jsonb_set(
       v_tokens,
       array[v_target],
       (
         v_slot - 'pending_hash' - 'pending_ref' - 'pending_at'
       ) || jsonb_build_object(
         'active_hash', v_pending_hash,
         'active_ref', v_active_ref,
         'activated_at', now()
       ),
       true
     ),
     updated_at = now()
   where p.id = p_project_id
     and p.user_id = v_user_id;
end;
$$;

revoke all on function public.website_studio_stage_form_deployment_token(uuid, text, text, text)
  from public, anon, service_role;
revoke all on function public.website_studio_promote_form_deployment_token(uuid, text, text, text)
  from public, anon, service_role;

grant execute on function public.website_studio_stage_form_deployment_token(uuid, text, text, text)
  to authenticated;
grant execute on function public.website_studio_promote_form_deployment_token(uuid, text, text, text)
  to authenticated;
