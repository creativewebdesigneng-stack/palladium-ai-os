-- Enforce trusted-writer identity without cascading financial history on agent retirement.
create function private.enforce_agent_economy_account_owner() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' then
  if new.user_id is not distinct from old.user_id and new.agent_id is not distinct from old.agent_id and new.org_id is not distinct from old.org_id then return new;end if;
 end if;
 if not exists(select 1 from public.personal_agents a where a.id=new.agent_id and a.user_id=new.user_id and coalesce(a.org_id_fk,a.org_id) is not distinct from new.org_id) then
  raise exception 'Economy account must match an existing owned agent and organisation';
 end if;
 return new;
end $$;
revoke all on function private.enforce_agent_economy_account_owner() from public,anon,authenticated;
grant execute on function private.enforce_agent_economy_account_owner() to service_role;
create trigger agent_economy_account_owner_identity before insert or update on public.agent_economy_accounts for each row execute function private.enforce_agent_economy_account_owner();

create function private.enforce_agent_economy_entry_scope() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.agent_economy_accounts a where a.id=new.account_id and a.org_id is not distinct from new.org_id) then
  raise exception 'Economy entry organisation must match its account';
 end if;
 return new;
end $$;
revoke all on function private.enforce_agent_economy_entry_scope() from public,anon,authenticated;
grant execute on function private.enforce_agent_economy_entry_scope() to service_role;
create trigger agent_economy_entry_scope before insert or update on public.agent_economy_entries for each row execute function private.enforce_agent_economy_entry_scope();
