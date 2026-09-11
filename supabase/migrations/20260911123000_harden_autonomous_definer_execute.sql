-- Blackstar production security hardening:
-- SECURITY DEFINER Autonomous OS control-plane functions must not be directly callable by anonymous users.
-- Trigger execution continues through PostgreSQL's trigger machinery; direct RPC execution is unnecessary.

revoke all on function public.enforce_autonomous_goal_guardrails() from public, anon, authenticated;
grant execute on function public.enforce_autonomous_goal_guardrails() to service_role;

revoke all on function public.finalize_waiting_workflow_cancellation() from public, anon, authenticated;
revoke all on function public.notify_autonomous_goal_event() from public, anon, authenticated;
revoke all on function public.propagate_autonomous_run_cancellation() from public, anon, authenticated;
revoke all on function public.publish_autonomous_fleet_activity() from public, anon, authenticated;
revoke all on function public.reset_autonomous_recovery_after_success() from public, anon, authenticated;
revoke all on function public.schedule_autonomous_recovery() from public, anon, authenticated;
revoke all on function public.sync_autonomous_fleet_step_state() from public, anon, authenticated;
revoke all on function public.trigger_autonomous_goals_from_notification() from public, anon, authenticated;

-- Keep the explicitly public published-app read RPC unchanged:
-- public.get_published_app_studio_release(uuid)
