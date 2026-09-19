import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
const migration=readFileSync(new URL("../../../supabase/migrations/20260919172000_reconcile_agent_resume_lease_schema.sql",import.meta.url),"utf8");

describe("bounded agent task resume schema reconciliation",()=>{
 it("restores the execution, checkpoint and lease metadata of the original runtime",()=>{
   for(const column of ["checkpoint_state jsonb","checkpoint_version integer","checkpointed_at timestamptz","resume_count integer","resume_lease_token uuid","resume_lease_expires_at timestamptz","resume_last_error text","heartbeat_at timestamptz","provider text","model text"]){
     expect(migration).toContain(column);
   }
   expect(migration).toContain("create index if not exists agent_tasks_resume_lease_idx");
 });
 it("only claims safe checkpointed runs, never approval-paused or completed runs",()=>{
   expect(migration).toContain("t.status in ('queued', 'running')");
   expect(migration).toContain("t.checkpoint_state ->> 'safe_to_resume'");
   expect(migration).toContain("coalesce(t.resume_count, 0) < 3");
   expect(migration).toContain("for update skip locked");
   expect(migration).toContain("t.resume_lease_expires_at < now()");
 });
 it("keeps claim/release privileged and anonymous task access revoked",()=>{
   expect(migration).toContain("revoke all on public.agent_tasks from anon");
   expect(migration).toContain("revoke all on function public.claim_resumable_agent_task");
   expect(migration).toContain("revoke all on function public.release_agent_task_resume_lease");
   expect(migration).toContain("if auth.role() <> 'service_role' then");
   expect(migration).toContain("grant execute on function public.claim_resumable_agent_task");
 });
});
