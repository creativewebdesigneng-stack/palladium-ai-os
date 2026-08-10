-- 1. Prevent privilege escalation through self-service profile updates.
create or replace function public.prevent_profile_privilege_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is null for trusted server-side (service_role) contexts.
  if auth.uid() is not null then
    if new.role is distinct from old.role then
      raise exception 'Changing your own role is not permitted';
    end if;
    if new.org_id is distinct from old.org_id then
      raise exception 'Changing your own organisation is not permitted';
    end if;
    if new.id is distinct from old.id then
      raise exception 'Changing a profile id is not permitted';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_block_privilege_change on public.profiles;
create trigger profiles_block_privilege_change
  before update on public.profiles
  for each row execute function public.prevent_profile_privilege_change();

-- 2. Privileged helpers must not be callable from the Data API.
revoke all on function public.record_usage(uuid, text, numeric, text, uuid, jsonb) from anon, authenticated, public;
grant execute on function public.record_usage(uuid, text, numeric, text, uuid, jsonb) to service_role;

revoke all on function public.reap_stale_agent_tasks(uuid) from anon, authenticated, public;
grant execute on function public.reap_stale_agent_tasks(uuid) to service_role;

-- 3. Trigger-only helpers should never be directly invocable by clients.
revoke all on function public.set_updated_at() from anon, authenticated, public;
revoke all on function public.handle_new_user() from anon, authenticated, public;
revoke all on function public.handle_new_organisation() from anon, authenticated, public;
revoke all on function public.prevent_profile_privilege_change() from anon, authenticated, public;

-- 4. Anonymous visitors have no business running the identity helpers.
revoke all on function public.effective_plan(uuid, uuid) from anon;
revoke all on function public.has_active_subscription(uuid, text) from anon;
revoke all on function public.has_role(uuid, public.app_role) from anon;
revoke all on function public.can_access(uuid, uuid) from anon;
revoke all on function public.agent_is_visible(uuid) from anon;
revoke all on function public.workflow_is_visible(uuid) from anon;
revoke all on function public.workflow_run_is_visible(uuid) from anon;
revoke all on function public.workforce_is_visible(uuid) from anon;
revoke all on function public.team_org(uuid) from anon;