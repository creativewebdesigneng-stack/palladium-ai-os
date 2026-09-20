import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20260920223500_reconcile_agent_tool_authority.sql", import.meta.url),
  "utf8",
);

describe("agent tool authority schema reconciliation", () => {
  it("restores only the canonical catalogue, owner overrides and execution ledger", () => {
    for (const name of ["tools", "tool_permissions", "tool_executions"]) {
      expect(migration).toContain(`create table if not exists public.${name}`);
      expect(migration).toContain(`alter table public.${name} enable row level security`);
    }
    expect(migration).toContain("unique(agent_id,tool)");
    expect(migration).toContain("agent_task_id uuid references public.agent_tasks(id)");
  });

  it("preserves private tenant scope and service-role-only catalogue writes", () => {
    expect(migration).toContain("revoke all on public.tools from public,anon,authenticated");
    expect(migration).toContain("grant select on public.tools to authenticated");
    expect(migration).toContain("grant all on public.tools to service_role");
    expect(migration).toContain("user_id=(select auth.uid())");
    expect(migration).toContain("a.id=agent_id and a.user_id=(select auth.uid())");
    expect(migration).toContain("t.id=agent_task_id and t.user_id=(select auth.uid())");
    expect(migration).toContain("revoke all on public.tool_executions from public,anon,authenticated");
  });

  it("does not assign tools, grant elevated execution, or enable background work", () => {
    expect(migration).toContain("requires_approval boolean not null default true");
    expect(migration).toContain("on conflict(slug) do nothing");
    expect(migration).not.toMatch(/update\s+public\.personal_agents\s+set\s+allowed_tools/i);
    expect(migration).not.toContain("cron.schedule(");
    expect(migration).not.toContain("security definer");
  });
});
