import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql=readFileSync(new URL("../../../../supabase/migrations/20260920203500_secure_skill_script_execution_ledger.sql",import.meta.url),"utf8");
const server=readFileSync(new URL("../agent-skills/skill-script-approval.server.ts",import.meta.url),"utf8");

describe("approved skill script single-use ledger production reconciliation",()=>{
  it("retains original unique immutable approval-to-execution identity",()=>{
    expect(sql).toContain("approval_request_id uuid not null unique references public.approval_requests(id)");
    expect(sql).toContain("fingerprint ~ '^[a-f0-9]{64}$'");
    expect(sql).toContain("create table if not exists public.agent_skill_script_executions");
    expect(sql).toContain("alter table public.agent_skill_script_executions enable row level security");
  });

  it("never lets an authenticated client forge a script claim or execution result",()=>{
    expect(sql).toContain("revoke all on public.agent_skill_script_executions from public,anon,authenticated");
    expect(sql).toContain("grant select on public.agent_skill_script_executions to authenticated");
    expect(sql).toContain("grant all on public.agent_skill_script_executions to service_role");
    expect(sql).not.toContain('create policy "agent_skill_script_executions_insert_own"');
    expect(sql).not.toContain('create policy "agent_skill_script_executions_update_own"');
  });

  it("validates the owner's approval before claiming through the server-only database client",()=>{
    expect(server).toContain("if (approval.status !== \"approved\")");
    expect(server).toContain("fingerprint !== details.fingerprint");
    expect(server).toContain("await import(\"@/integrations/supabase/client.server\")");
    const replay=server.slice(server.indexOf("export async function replayApprovedSkillScript"));
    expect(replay).toContain("const ledger = supabaseAdmin as unknown as Sb");
    expect(replay).toContain("const { data: claimed, error: claimError } = await ledger");
    expect(replay).toContain("const { error: ledgerError } = await ledger");
  });
});
