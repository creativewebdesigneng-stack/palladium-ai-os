import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

const migration=readFileSync(
  new URL("../../../supabase/migrations/20260920200500_reconcile_approval_request_foundation.sql",import.meta.url),
  "utf8",
);

describe("approval request production schema reconciliation",()=>{
  it("restores the canonical human-decision and execution contract",()=>{
    expect(migration).toContain("create table if not exists public.approval_requests");
    for(const field of [
      "user_id uuid not null","agent_id uuid","task_id uuid","action_type text",
      "details jsonb","status text","decided_at timestamptz","decided_by uuid",
      "execution_status text","execution_result jsonb","execution_error text",
      "expires_at timestamptz",
    ]) expect(migration).toContain(field);
    expect(migration).toContain("check(execution_status is null or execution_status in ('executing','succeeded','failed'))");
  });

  it("makes action details immutable and decisions terminal",()=>{
    expect(migration).toContain("approval_requests_transition_guard");
    expect(migration).toContain("new.title,new.details,new.summary");
    expect(migration).toContain("Approval decisions are terminal");
    expect(migration).toContain("Invalid approval execution transition");
    expect(migration).toContain("Only approved requests may execute");
    expect(migration).toContain("status='pending' and execution_status is null");
  });

  it("allows only an authenticated owner to create and decide their own requests",()=>{
    expect(migration).toContain("revoke all on public.approval_requests from public,anon,authenticated");
    expect(migration).toContain("grant select,insert on public.approval_requests to authenticated");
    expect(migration).toContain("grant update(status,decided_at,decided_by,decision_note,execution_status,");
    expect(migration).not.toMatch(/grant update on public\.approval_requests to authenticated/i);
    expect(migration).toContain("grant all on public.approval_requests to service_role");
    expect(migration).toContain("using(user_id=(select auth.uid()))");
    expect(migration).toContain("with check(user_id=(select auth.uid()))");
    expect(migration).toContain("private.is_org_member(org_id)");
    expect(migration).toContain("t.user_id=(select auth.uid())");
  });

  it("does not execute tools or start new schedulers",()=>{
    expect(migration).not.toContain("cron.schedule(");
    expect(migration).not.toContain("security definer");
    expect(migration).not.toContain("executeApprovedAction");
  });
});
