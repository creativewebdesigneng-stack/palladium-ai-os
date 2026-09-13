-- Verify runtime worker bearer tokens without exposing the credential table or hashes.
-- The public API roles may invoke only this boolean oracle; the table itself remains inaccessible.

create or replace function public.verify_runtime_worker_token(
  worker_name text,
  supplied_token text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if supplied_token is null or length(supplied_token) < 32 then
    return false;
  end if;

  if worker_name not in ('workflow_runner', 'webhook_retry') then
    return false;
  end if;

  return coalesce((
    select c.enabled
      and encode(extensions.digest(supplied_token, 'sha256'), 'hex') = c.token_sha256
    from public.runtime_worker_credentials as c
    where c.name = worker_name
  ), false);
end;
$$;

revoke all on function public.verify_runtime_worker_token(text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.verify_runtime_worker_token(text, text) to anon, service_role;

-- Token hashes no longer need to be readable through PostgREST by any API role.
revoke all on public.runtime_worker_credentials from public, anon, authenticated, service_role;
