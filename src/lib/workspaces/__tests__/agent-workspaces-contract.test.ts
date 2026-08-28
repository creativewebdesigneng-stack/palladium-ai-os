import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260828200000_agent_workspaces_context_timeline.sql", "utf8");
const functions = readFileSync("src/lib/workspaces/agent-workspaces.functions.ts", "utf8");
const tool = readFileSync("src/lib/workspaces/agent-workspace-tool.server.ts", "utf8");
const runtime = readFileSync("src/lib/runtime/tools.server.ts", "utf8");
const screen = readFileSync("src/screens/AgentWorkspaces.jsx", "utf8");
const route = readFileSync("src/routes/_shell/_app/agent-workspaces.tsx", "utf8");
const sidebar = readFileSync("src/components/palladium/Sidebar.jsx", "utf8");

describe("Crystal + Memex native concept transfer", () => {
  it("adds owner-scoped orchestration/context stores without credentials", () => {
    expect(migration).toContain("create table if not exists public.agent_workspaces");
    expect(migration).toContain("create table if not exists public.context_timeline_cards");
    expect(migration).toContain("isolation_mode in ('shared','worktree')");
    expect(migration).toContain("auth.uid() = user_id");
    expect(migration).not.toMatch(/access_token|refresh_token|api_key|client_secret|password\s+text/i);
  });

  it("reuses existing Knowledge indexing instead of introducing another memory engine", () => {
    expect(functions).toContain('import { ingestDocument } from "@/lib/memory/memory.server"');
    expect(functions).toContain("promoteContextCardToKnowledge");
    expect(functions).toContain("await ingestDocument");
    expect(functions).toContain("context-card:");
  });

  it("keeps agent access behind the existing Harness and tool audit wrapper", () => {
    expect(tool).toContain('name: "agent_workspace"');
    expect(tool).toContain("create_workspace");
    expect(tool).toContain("create_context");
    expect(tool).toContain("does not execute shell commands");
    expect(runtime).toContain("AGENT_WORKSPACE_TOOL_DEF");
    expect(runtime).toContain("runAgentWorkspaceTool");
    expect(runtime).toContain("assertHarnessToolInput");
    expect(runtime).toContain('from("tool_executions")');
  });

  it("exposes a first-class workspace and timeline UI", () => {
    expect(route).toContain('createFileRoute("/_shell/_app/agent-workspaces")');
    expect(sidebar).toContain("['Agent Workspaces', '/agent-workspaces', Layers3]");
    expect(screen).toContain('title="Agent Workspaces"');
    expect(screen).toContain("Git worktree");
    expect(screen).toContain("Promote");
  });
});
