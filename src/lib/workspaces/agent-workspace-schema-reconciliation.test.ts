import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration=readFileSync(new URL("../../../supabase/migrations/20260920223000_reconcile_agent_workspaces_context_timeline.sql",import.meta.url),"utf8");

describe("Agent Workspace production reconciliation",()=>{
  it("restores existing Agent Workspace and Context Timeline contracts",()=>{
    expect(migration).toContain("create table if not exists public.agent_workspaces");
    expect(migration).toContain("create table if not exists public.context_timeline_cards");
    for(const field of ["isolation_mode text","runtime_task_id uuid","knowledge_document_id uuid","occurred_at timestamptz","pinned boolean"]){
      expect(migration).toContain(field);
    }
  });

  it("keeps anonymous access denied and authenticated writes owned",()=>{
    expect(migration).toContain("revoke all on public.agent_workspaces,public.context_timeline_cards from public,anon,authenticated");
    expect(migration).toContain("grant all on public.agent_workspaces,public.context_timeline_cards to service_role");
    expect(migration).toContain("for insert to authenticated");
    expect(migration).toContain("w.id=workspace_id and w.user_id=(select auth.uid())");
    expect(migration).toContain("a.id=agent_id and a.user_id=(select auth.uid())");
  });

  it("does not start background jobs or grant agent execution authority",()=>{
    expect(migration).not.toContain("cron.schedule(");
    expect(migration).not.toContain("grant execute on function");
    expect(migration).not.toContain("security definer");
  });
});
