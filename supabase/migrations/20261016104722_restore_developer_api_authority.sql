-- Restore the existing developer API contract, with server-owned secrets and quotas.
do $$ begin
  if to_regclass('public.api_keys') is not null or to_regclass('public.api_request_logs') is not null then
    raise exception 'Developer API recovery requires both tables absent';
  end if;
end $$;
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organisations(id) on delete cascade,
  name text not null check(length(name) between 1 and 80),
  key_prefix text not null, key_hash text not null unique check(key_hash ~ '^[0-9a-f]{64}$'),
  last_four text, environment text not null default 'live' check(environment in ('live','test')),
  scopes text[] not null default '{}' check(scopes <@ array['agents:read','agents:write','agents:run','tasks:read','tasks:write','workflows:read','workflows:run','workforces:read','marketplace:read','usage:read']::text[] and array_position(scopes,null) is null),
  request_count bigint not null default 0 check(request_count>=0),
  last_used_at timestamptz, expires_at timestamptz, revoked_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,user_id)
);
create index api_keys_user_idx on public.api_keys(user_id);
create index api_keys_org_idx on public.api_keys(org_id);
create table public.api_request_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid, api_key_id uuid,
  method text not null, path text not null,
  status_code integer not null check(status_code=0 or status_code between 100 and 599),
  duration_ms integer check(duration_ms>=0), ip text, user_agent text, error text, plan_code text,
  is_execution boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key(api_key_id,user_id) references public.api_keys(id,user_id) on delete set null(api_key_id)
);
create index api_request_logs_user_created_idx on public.api_request_logs(user_id,created_at desc);
create index api_request_logs_key_owner_idx on public.api_request_logs(api_key_id,user_id);
alter table public.api_keys enable row level security;
alter table public.api_request_logs enable row level security;
revoke all on public.api_keys,public.api_request_logs from public,anon,authenticated;
grant select(id,user_id,org_id,name,key_prefix,last_four,environment,scopes,request_count,last_used_at,expires_at,revoked_at,created_at,updated_at) on public.api_keys to authenticated;
grant select on public.api_request_logs to authenticated;
grant all on public.api_keys,public.api_request_logs to service_role;
create policy api_keys_owner_read on public.api_keys for select to authenticated using(user_id=(select auth.uid()));
create policy api_logs_owner_read on public.api_request_logs for select to authenticated using(user_id=(select auth.uid()));

-- Narrow invoker RPCs: only the existing trusted server may supply verified plan limits.
-- A per-user transaction lock serializes checks and writes across concurrent requests/keys.
create function public.create_developer_api_key(p_user_id uuid,p_max_keys integer,p_name text,p_environment text,p_prefix text,p_last_four text,p_hash text,p_scopes text[],p_expires_at timestamptz)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare k public.api_keys;
begin
  if p_max_keys is null or p_max_keys<1 or p_max_keys>100 then raise exception 'Invalid key limit'; end if;
  perform pg_advisory_xact_lock(hashtextextended('blackstar-api-keys:'||p_user_id::text,0));
  if (select count(*) from public.api_keys where user_id=p_user_id and revoked_at is null and (expires_at is null or expires_at>now()))>=p_max_keys then
    return jsonb_build_object('error','key_quota_exceeded');
  end if;
  insert into public.api_keys(user_id,name,environment,key_prefix,last_four,key_hash,scopes,expires_at)
  values(p_user_id,p_name,p_environment,p_prefix,p_last_four,p_hash,p_scopes,p_expires_at) returning * into k;
  return to_jsonb(k)-'key_hash';
end $$;

create function public.reserve_developer_api_request(p_user_id uuid,p_key_id uuid,p_hash text,p_scope text,p_method text,p_path text,p_plan text,p_minute integer,p_day integer,p_execution_limit integer,p_execution boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare k public.api_keys; request_id uuid; minute_count bigint; day_count bigint; execution_count bigint;
begin
  if p_minute is null or p_minute<1 or p_minute>3000 or p_day is null or p_day<1 or p_day>2000000 or p_execution_limit is null or p_execution_limit<0 or p_execution_limit>250000 or p_execution is null then raise exception 'Invalid API limits'; end if;
  perform pg_advisory_xact_lock(hashtextextended('blackstar-api-requests:'||p_user_id::text,0));
  select * into k from public.api_keys where id=p_key_id and user_id=p_user_id for update;
  if not found or k.key_hash is distinct from p_hash or k.revoked_at is not null or k.expires_at<=now() or p_scope is null or not(p_scope=any(k.scopes)) then
    return jsonb_build_object('error','invalid_api_key');
  end if;
  select count(*) filter(where created_at>now()-interval '1 minute'),count(*),count(*) filter(where is_execution)
  into minute_count,day_count,execution_count from public.api_request_logs where user_id=p_user_id and created_at>now()-interval '24 hours';
  if minute_count>=p_minute then return jsonb_build_object('error','rate_limit_exceeded'); end if;
  if day_count>=p_day then return jsonb_build_object('error','daily_quota_exceeded'); end if;
  if p_execution and execution_count>=p_execution_limit then return jsonb_build_object('error','execution_quota_exceeded'); end if;
  insert into public.api_request_logs(user_id,org_id,api_key_id,method,path,status_code,plan_code,is_execution)
  values(p_user_id,k.org_id,k.id,p_method,p_path,0,p_plan,p_execution) returning id into request_id;
  update public.api_keys set request_count=request_count+1,last_used_at=now(),updated_at=now() where id=k.id;
  return jsonb_build_object('id',request_id);
end $$;
revoke all on function public.create_developer_api_key(uuid,integer,text,text,text,text,text,text[],timestamptz),public.reserve_developer_api_request(uuid,uuid,text,text,text,text,text,integer,integer,integer,boolean) from public,anon,authenticated;
grant execute on function public.create_developer_api_key(uuid,integer,text,text,text,text,text,text[],timestamptz),public.reserve_developer_api_request(uuid,uuid,text,text,text,text,text,integer,integer,integer,boolean) to service_role;
