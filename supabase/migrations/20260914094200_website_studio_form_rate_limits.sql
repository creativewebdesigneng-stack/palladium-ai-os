create table if not exists public.website_studio_form_rate_limits (
  project_id uuid not null references public.website_studio_projects(id) on delete cascade,
  form_key text not null check (char_length(form_key) between 1 and 120),
  identity_hash text not null check (identity_hash ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  request_count integer not null default 1 check (request_count >= 1),
  updated_at timestamptz not null default now(),
  primary key (project_id, form_key, identity_hash, window_start)
);

create index if not exists website_studio_form_rate_limits_cleanup_idx
  on public.website_studio_form_rate_limits (project_id, form_key, identity_hash, window_start desc);

alter table public.website_studio_form_rate_limits enable row level security;

revoke all on table public.website_studio_form_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.website_studio_form_rate_limits to service_role;

create or replace function public.website_studio_form_rate_limit(
  p_project_id uuid,
  p_form_key text,
  p_identity_hash text,
  p_limit integer default 10,
  p_window_seconds integer default 60
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_start timestamptz;
  v_count integer;
begin
  if p_project_id is null
     or p_form_key is null
     or char_length(trim(p_form_key)) not between 1 and 120
     or p_identity_hash is null
     or p_identity_hash !~ '^[0-9a-f]{64}$'
     or p_limit is null
     or p_limit not between 1 and 1000
     or p_window_seconds is null
     or p_window_seconds not between 10 and 3600 then
    raise exception 'invalid rate limit parameters' using errcode = '22023';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  );

  delete from public.website_studio_form_rate_limits
   where project_id = p_project_id
     and form_key = trim(p_form_key)
     and identity_hash = p_identity_hash
     and window_start < v_window_start - make_interval(secs => p_window_seconds * 2);

  insert into public.website_studio_form_rate_limits (
    project_id,
    form_key,
    identity_hash,
    window_start,
    request_count,
    updated_at
  ) values (
    p_project_id,
    trim(p_form_key),
    p_identity_hash,
    v_window_start,
    1,
    v_now
  )
  on conflict (project_id, form_key, identity_hash, window_start)
  do update set
    request_count = public.website_studio_form_rate_limits.request_count + 1,
    updated_at = excluded.updated_at
  returning request_count into v_count;

  allowed := v_count <= p_limit;
  retry_after_seconds := case
    when allowed then 0
    else greatest(
      1,
      ceil(extract(epoch from ((v_window_start + make_interval(secs => p_window_seconds)) - v_now)))::integer
    )
  end;
  return next;
end;
$$;

revoke all on function public.website_studio_form_rate_limit(uuid, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.website_studio_form_rate_limit(uuid, text, text, integer, integer)
  to service_role;
