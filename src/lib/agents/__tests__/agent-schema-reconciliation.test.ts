import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

const migration=readFileSync(new URL("../../../../supabase/migrations/20260919175500_reconcile_agent_builder_runtime_schema.sql",import.meta.url),"utf8");

describe("agent builder production schema reconciliation",()=>{
  it("restores every agent configuration field written by the canonical agent builder",()=>{
    for(const field of [
      "description text","purpose text","personality text","instructions text",
      "system_prompt text","model_provider text","model text","temperature numeric",
      "max_tokens integer","memory_enabled boolean","allowed_tools text[]",
      "allowed_providers text[]","requires_approval boolean","autonomy text",
      "preferences jsonb","operating_profile jsonb","spec_version integer",
    ]) expect(migration).toContain(field);
    for(const field of ["title text","output_text text","tool_calls integer","cancel_requested boolean"]){
      expect(migration).toContain(field);
    }
  });
  it("keeps task and agent records private and only permits owner writes",()=>{
    expect(migration).toContain("revoke all on public.personal_agents from public,anon");
    expect(migration).toContain("revoke all on public.agent_tasks from public,anon");
    expect(migration).toContain("user_id=(select auth.uid())");
    expect(migration).toContain("private.is_org_member(org_id_fk)");
    expect(migration).toContain("a.id=agent_id and a.user_id=(select auth.uid())");
    expect(migration).toContain("for delete to authenticated using (user_id=(select auth.uid()))");
  });
  it("does not elevate tool permissions or start automatic tasks",()=>{
    expect(migration).toContain("requires_approval boolean not null default true");
    expect(migration).toContain("allowed_tools text[] not null default '{}'::text[]");
    expect(migration).not.toContain("cron.schedule(");
    expect(migration).not.toContain("security definer");
  });
});
