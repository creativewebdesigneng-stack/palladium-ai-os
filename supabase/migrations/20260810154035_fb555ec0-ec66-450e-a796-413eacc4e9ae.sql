revoke all on function public.workflow_run_is_visible(uuid) from anon, public;
grant execute on function public.workflow_run_is_visible(uuid) to authenticated, service_role;

revoke all on function public.effective_plan(uuid, uuid) from anon, authenticated, public;
grant execute on function public.effective_plan(uuid, uuid) to service_role;

revoke all on function public.has_active_subscription(uuid, text) from anon, authenticated, public;
grant execute on function public.has_active_subscription(uuid, text) to service_role;