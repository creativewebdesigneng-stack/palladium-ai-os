import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql=readFileSync(new URL("../../../supabase/migrations/20260920205500_backend_only_approval_execution_evidence.sql",import.meta.url),"utf8");
const external=readFileSync(new URL("../mission/external-action-approval.functions.ts",import.meta.url),"utf8");
const hub=readFileSync(new URL("../ai-hub/approval.server.ts",import.meta.url),"utf8");

describe("approval execution evidence backend-only contract",()=>{
  it("revokes direct client mutation of execution evidence without revoking human decisions",()=>{
    expect(sql).toContain("revoke update (execution_status,executed_at,execution_error,execution_result)");
    expect(sql).toContain("on public.approval_requests from authenticated");
    expect(sql).toContain("Only the backend may record approval execution evidence");
    expect(sql).toContain("if coalesce(auth.role(),'')='authenticated'");
    expect(sql).not.toContain("revoke update (status,decided_at");
  });

  it("keeps the external approval read on the caller client but claims and finalizes with backend credentials",()=>{
    expect(external).toContain("const sb = context.supabase as unknown as Sb");
    expect(external).toContain("const approvalDb = supabaseAdmin as unknown as Sb");
    expect((external.match(/await approvalDb\s+\.from\("approval_requests"\)\s+\.update\(/g)??[]).length).toBe(5);
    expect(external).not.toMatch(/await sb\s+\.from\("approval_requests"\)\s+\.update\(/);
    expect(external).toContain('const { supabaseAdmin } = await import("@/integrations/supabase/client.server")');
  });

  it("uses backend-only execution evidence for the AI Hub while keeping owner request creation",()=>{
    expect(hub).toContain("const executionDb = await privilegedApprovalDb()");
    expect((hub.match(/executionDb\s+\.from\('approval_requests'\)\s+\.update\(/g)??[]).length).toBe(2);
    expect(hub).toContain("const { supabaseAdmin } = await import('@/integrations/supabase/client.server')");
    expect(hub).toContain("let existingQuery = db");
  });
});
