import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

const migration=readFileSync(
  new URL("../../../supabase/migrations/20260919164000_reconcile_workforce_queue_schema.sql",import.meta.url),
  "utf8",
);

describe("production workforce queue schema reconciliation",()=>{
  it("restores canonical workflow and workforce execution tables",()=>{
    for(const table of [
      "workforces","workforce_agents","workflow_steps","workflow_runs",
      "workflow_step_runs","agent_messages",
    ]) expect(migration).toContain(`create table if not exists public.${table}`);
    expect(migration).toContain("add column if not exists workforce_id");
    expect(migration).toContain("worker_heartbeat_at timestamptz");
    expect(migration).toContain("worker_claimed_at timestamptz");
    expect(migration).toContain("waiting_approval_request_id uuid");
  });

  it("keeps step and message execution writes under service-role authority",()=>{
    for(const table of ["workflow_step_runs","agent_messages"]){
      expect(migration).toContain(`grant all on public.${table} to service_role`);
      expect(migration).toContain(`grant select on public.${table} to authenticated`);
      expect(migration).not.toContain(`grant insert,update,delete on public.${table} to authenticated`);
    }
    expect(migration).toContain("status='queued' and cancel_requested=false");
    expect(migration).toContain("waiting_approval_request_id is null");
    expect(migration).toContain("w.user_id=auth.uid()");
  });

  it("preserves existing workflow definitions rather than recreating them",()=>{
    expect(migration).toContain("alter table public.workflows");
    expect(migration).not.toContain("create table if not exists public.workflows (");
    expect(migration).not.toMatch(/drop\s+table|truncate\s+table|delete\s+from/i);
  });
});
