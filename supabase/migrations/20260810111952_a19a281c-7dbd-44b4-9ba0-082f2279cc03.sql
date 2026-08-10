do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig, p.prosecdef, p.prorettype
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

-- re-grant only what signed-in app code needs to call directly
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, public.org_role[]) to authenticated;
grant execute on function public.org_admin(uuid) to authenticated;
grant execute on function public.can_access(uuid, uuid) to authenticated;
grant execute on function public.team_org(uuid) to authenticated;
grant execute on function public.agent_is_visible(uuid) to authenticated;
grant execute on function public.workflow_is_visible(uuid) to authenticated;
grant execute on function public.workforce_is_visible(uuid) to authenticated;
grant execute on function public.effective_plan(uuid, uuid) to authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;