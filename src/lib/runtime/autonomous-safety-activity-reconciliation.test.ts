import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
const sql=readFileSync(new URL("../../../supabase/migrations/20260919174000_reconcile_autonomous_safety_activity.sql",import.meta.url),"utf8");
describe("Autonomous OS production safety reconciliation",()=>{
 it("restores the actual Mission Control activity ledger with owner-only visibility",()=>{
   expect(sql).toContain("create table if not exists public.agent_activities");
   expect(sql).toContain("alter table public.agent_activities enable row level security");
   expect(sql).toContain("revoke all on public.agent_activities from public,anon,authenticated");
   expect(sql).toContain("for select to authenticated using (user_id=(select auth.uid()))");
 });
 it("restores workflow cancellation, notifications, guardrails and bounded recovery",()=>{
   for(const name of [
     "propagate_autonomous_run_cancellation",
     "notify_autonomous_goal_event",
     "trigger_autonomous_goals_from_notification",
     "enforce_autonomous_goal_guardrails",
     "sync_autonomous_fleet_step_state",
     "publish_autonomous_fleet_activity",
     "schedule_autonomous_recovery",
     "reset_autonomous_recovery_after_success",
   ]) expect(sql).toContain(`function public.${name}()`);
   expect(sql).toContain("budget ceiling reached");
   expect(sql).toContain("runtime ceiling reached");
   expect(sql).toContain("goal_row.recovery_attempts >= 2");
 });
 it("does not grant public access to trusted trigger functions or start the workflow runner",()=>{
   expect(sql).toContain("alter function public.touch_autonomous_os_updated_at() set search_path = public");
   expect(sql).toContain("revoke execute on function public.enforce_autonomous_goal_guardrails() from public,anon,authenticated");
   expect(sql).not.toContain("blackstar-workflow-runner");
   expect(sql).not.toContain("runtime-worker-dispatch?worker=workflow_runner");
 });
});
