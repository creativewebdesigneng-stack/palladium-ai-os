-- Blackstar: optimize owner-scoped RLS auth evaluation without changing access semantics.
-- Supabase's auth_rls_initplan advisor recommends wrapping auth.uid() in SELECT so
-- PostgreSQL evaluates it once per statement instead of once per row.
--
-- This migration is deliberately fail-closed:
--   * only the 44 policies reported by the production advisor are allow-listed;
--   * policy command, roles, permissive/restrictive mode and non-auth predicates stay untouched;
--   * a missing policy or an already-changed predicate aborts instead of guessing.

do $rls$
declare
  target record;
  policy_row record;
  original_qual text;
  original_check text;
  optimized_qual text;
  optimized_check text;
  processed integer := 0;
begin
  for target in
    select *
    from (values
    ('voice_studio_jobs', 'voice_studio_jobs_delete_own'),
    ('voice_studio_jobs', 'voice_studio_jobs_insert_own'),
    ('voice_studio_jobs', 'voice_studio_jobs_select_own'),
    ('voice_studio_jobs', 'voice_studio_jobs_update_own'),
    ('workflows', 'wf_owner_delete'),
    ('workflows', 'wf_owner_insert'),
    ('workflows', 'wf_owner_update'),
    ('mobile_intelligence_devices', 'mobile devices owner delete'),
    ('mobile_intelligence_devices', 'mobile devices owner insert'),
    ('mobile_intelligence_devices', 'mobile devices owner read'),
    ('mobile_intelligence_devices', 'mobile devices owner update'),
    ('mobile_intelligence_audit_events', 'mobile audit owner insert'),
    ('mobile_intelligence_audit_events', 'mobile audit owner read'),
    ('webhooks', 'webhooks_owner_delete'),
    ('webhooks', 'webhooks_owner_insert'),
    ('webhooks', 'webhooks_owner_select'),
    ('webhooks', 'webhooks_owner_update'),
    ('personal_reminders', 'Users can cancel their own personal reminders'),
    ('personal_reminders', 'Users can create their own personal reminders'),
    ('personal_reminders', 'Users can view their own personal reminders'),
    ('webhook_deliveries', 'webhook_deliveries_owner_select'),
    ('workforces', 'workforces_owner_delete'),
    ('workforces', 'workforces_owner_insert'),
    ('workforces', 'workforces_owner_select'),
    ('workforces', 'workforces_owner_update'),
    ('personal_tasks', 'pt_all_own'),
    ('workforce_agents', 'workforce_agents_owner_all'),
    ('workflow_steps', 'workflow_steps_owner_write'),
    ('workflow_steps', 'workflow_steps_select'),
    ('workflow_runs', 'workflow_runs_owner_queue'),
    ('workflow_runs', 'workflow_runs_owner_select'),
    ('workflow_step_runs', 'workflow_step_runs_owner_select'),
    ('agent_messages', 'agent_messages_owner_select'),
    ('autonomous_goals', 'autonomous_goals_owner_delete'),
    ('autonomous_goals', 'autonomous_goals_owner_insert'),
    ('autonomous_goals', 'autonomous_goals_owner_select'),
    ('autonomous_goals', 'autonomous_goals_owner_update'),
    ('autonomous_goal_runs', 'autonomous_goal_runs_owner_delete'),
    ('autonomous_goal_runs', 'autonomous_goal_runs_owner_insert'),
    ('autonomous_goal_runs', 'autonomous_goal_runs_owner_select'),
    ('autonomous_goal_runs', 'autonomous_goal_runs_owner_update'),
    ('autonomous_goal_events', 'autonomous_goal_events_owner_insert'),
    ('autonomous_goal_events', 'autonomous_goal_events_owner_select'),
    ('agent_skill_script_executions', 'agent_skill_script_executions_select_own')
    ) as targets(table_name, policy_name)
  loop
    select
      p.polqual,
      p.polwithcheck,
      c.oid as relid
    into policy_row
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = target.table_name
      and p.polname = target.policy_name;

    if not found then
      raise exception 'rls_policy_not_found: %.%', target.table_name, target.policy_name;
    end if;

    original_qual := case
      when policy_row.polqual is null then null
      else pg_get_expr(policy_row.polqual, policy_row.relid)
    end;
    original_check := case
      when policy_row.polwithcheck is null then null
      else pg_get_expr(policy_row.polwithcheck, policy_row.relid)
    end;

    if coalesce(position('auth.uid()' in original_qual), 0) = 0
       and coalesce(position('auth.uid()' in original_check), 0) = 0 then
      raise exception 'rls_policy_no_direct_auth_uid: %.%', target.table_name, target.policy_name;
    end if;

    optimized_qual := case
      when original_qual is null then null
      else replace(original_qual, 'auth.uid()', '(select auth.uid())')
    end;
    optimized_check := case
      when original_check is null then null
      else replace(original_check, 'auth.uid()', '(select auth.uid())')
    end;

    if optimized_qual is not null and optimized_check is not null then
      execute format(
        'alter policy %I on public.%I using (%s) with check (%s)',
        target.policy_name,
        target.table_name,
        optimized_qual,
        optimized_check
      );
    elsif optimized_qual is not null then
      execute format(
        'alter policy %I on public.%I using (%s)',
        target.policy_name,
        target.table_name,
        optimized_qual
      );
    elsif optimized_check is not null then
      execute format(
        'alter policy %I on public.%I with check (%s)',
        target.policy_name,
        target.table_name,
        optimized_check
      );
    else
      raise exception 'rls_policy_has_no_expression: %.%', target.table_name, target.policy_name;
    end if;

    processed := processed + 1;
  end loop;

  if processed <> 44 then
    raise exception 'rls_policy_target_count_mismatch: %', processed;
  end if;
end
$rls$;
