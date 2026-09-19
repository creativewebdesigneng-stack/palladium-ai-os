import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
const migration=readFileSync(new URL("../../../supabase/migrations/20260919165000_reconcile_autonomous_goal_foundation.sql",import.meta.url),"utf8");

describe("Autonomous OS production schema reconciliation",()=>{
  it("reuses the original persistent goal, run, event, and fleet assignment tables",()=>{
    for(const name of ["autonomous_goals","autonomous_goal_runs","autonomous_goal_events","autonomous_goal_fleet_assignments"]){
      expect(migration).toContain(`create table if not exists public.${name}`);
      expect(migration).toContain(`alter table public.${name} enable row level security`);
    }
    expect(migration).toContain("workflow_run_id uuid references public.workflow_runs(id)");
    expect(migration).toContain("scheduler_lease_until timestamptz");
    expect(migration).toContain("require_approval_for_external_actions boolean not null default true");
  });
  it("keeps every owner scope and excludes anonymous database access",()=>{
    expect(migration).toContain("revoke all on public.autonomous_goals,public.autonomous_goal_runs,");
    expect(migration).toContain("from public,anon,authenticated");
    expect(migration).toContain("grant all on public.autonomous_goals,public.autonomous_goal_runs,");
    expect(migration).toContain("to service_role");
    expect(migration).toContain("auth.uid() = user_id");
    expect(migration).toContain("revoke execute on function public.touch_autonomous_os_updated_at()");
  });
  it("does not activate any autonomous worker before a healthy production probe",()=>{
    expect(migration).not.toContain("cron.schedule(");
    expect(migration).not.toContain("active := true");
    expect(migration).not.toContain("perform cron.alter_job(");
  });
});
