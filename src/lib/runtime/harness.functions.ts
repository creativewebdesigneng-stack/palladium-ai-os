import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  HARNESS_CAPABILITIES,
  evaluateHarnessPolicy,
  evaluateSubagentSpawn,
  type HarnessPolicyInput,
  type SubagentSpawnInput,
} from "./agent-harness";

type Sb = { from: (table: string) => any };

export const getHarnessOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const definitions = [
      { key: "agents", table: "personal_agents", columns: "id,name,status,allowed_tools,requires_approval", order: "created_at", limit: 50 },
      { key: "tasks", table: "agent_tasks", columns: "id,agent_id,status,created_at,completed_at", order: "created_at", limit: 50 },
      { key: "approvals", table: "approval_requests", columns: "id,agent_id,action_type,risk_level,status,created_at", order: "created_at", limit: 25 },
      { key: "tools", table: "tools", columns: "slug,name,category,is_active", order: "category", limit: 250 },
      { key: "permissions", table: "tool_permissions", columns: "tool,agent_id,enabled,requires_approval", order: "tool", limit: 250 },
      { key: "executions", table: "tool_executions", columns: "id,tool,status,created_at,duration_ms,agent_id", order: "created_at", limit: 30 },
      { key: "identities", table: "agent_identities", columns: "id,agent_id,status,trust_tier,canonical_id", order: "created_at", limit: 100 },
      { key: "passports", table: "agent_passports", columns: "id,identity_id,autonomy_tier,risk_tier,issued_at,agent_identities!inner(user_id)", order: "issued_at", limit: 100 },
      { key: "delegations", table: "agent_delegation_grants", columns: "id,status,requires_approval,allow_external_actions,expires_at", order: "created_at", limit: 100 },
      { key: "a2a", table: "agent_a2a_messages", columns: "id,status,requires_approval,kind,created_at,expires_at", order: "created_at", limit: 100 },
    ] as const;
    // An unavailable collection is not an empty collection. Keep each source's
    // verification independent so existing runtime activity remains inspectable.
    const results = await Promise.allSettled(definitions.map(async definition => {
      let query = sb.from(definition.table).select(definition.columns);
      if (definition.key === "passports") query = query.eq("agent_identities.user_id", context.userId);
      else if (definition.key !== "tools") query = query.eq("user_id", context.userId);
      else query = query.eq("is_active", true); // Shared catalogue, not user data.
      if (definition.key === "approvals") query = query.eq("status", "pending");
      return await query.order(definition.order, { ascending: definition.key === "tools" || definition.key === "permissions" }).limit(definition.limit + 1);
    }));
    const rows: Record<string, any[]> = {};
    const sources: Record<string, { available: boolean; limit: number; truncated: boolean }> = {};
    definitions.forEach((definition, index) => {
      const result = results[index];
      const value = result?.status === "fulfilled" ? result.value : null;
      const available = value != null && !value.error && Array.isArray(value.data);
      sources[definition.key] = { available, limit: definition.limit, truncated: available && value.data.length > definition.limit };
      rows[definition.key] = available ? value.data.slice(0, definition.limit).map((row: Record<string, unknown>) => {
        if (definition.key !== "passports") return row;
        const { agent_identities: _ownerJoin, ...metadata } = row;
        return metadata;
      }) : [];
    });
    const agentRows = rows["agents"]!;
    const taskRows = rows["tasks"]!;
    const permissionRows = rows["permissions"]!;
    const identityRows = rows["identities"]!;
    const passportRows = rows["passports"]!;
    const delegationRows = rows["delegations"]!;
    const a2aRows = rows["a2a"]!;
    const count = (source: string, value: number) => sources[source]?.available ? value : null;
    const now = Date.now();
    const unexpired = (value: unknown) => value == null || (typeof value === "string" && Date.parse(value) > now);
    const runningStates = new Set(["pending", "queued", "running", "waiting_for_tool", "waiting_for_approval"]);
    const liveA2aStates = new Set(["queued", "pending_approval", "delivered"]);

    return {
      capabilities: HARNESS_CAPABILITIES,
      sources,
      observedAt: new Date(now).toISOString(),
      stats: {
        agents: count("agents", agentRows.length),
        activeAgents: count("agents", agentRows.filter((agent: any) => agent.status === "active" || agent.status === "online").length),
        liveRuns: count("tasks", taskRows.filter((task: any) => runningStates.has(task.status)).length),
        pendingApprovals: count("approvals", rows["approvals"]!.length),
        enabledToolGrants: count("permissions", permissionRows.filter((permission: any) => permission.enabled === true).length),
        trustedIdentities: count("identities", identityRows.filter((identity: any) => identity.status === "active").length),
        passports: count("passports", passportRows.length),
        activeDelegations: count("delegations", delegationRows.filter((grant: any) => grant.status === "active" && unexpired(grant.expires_at)).length),
        liveA2aMessages: count("a2a", a2aRows.filter((message: any) => liveA2aStates.has(message.status) && unexpired(message.expires_at)).length),
      },
      trustFabric: {
        identities: identityRows,
        passports: passportRows,
        delegations: delegationRows,
        a2a: a2aRows,
      },
      agents: agentRows,
      tasks: taskRows,
      approvals: rows["approvals"]!,
      tools: rows["tools"]!,
      permissions: permissionRows,
      executions: rows["executions"]!,
      policy: {
        credentials: "deny",
        privilegedSandbox: "deny",
        safeReads: "allow",
        writes: "approval",
        externalEffects: "approval",
        subagentEscalation: "deny",
        maxSubagentDepth: 2,
      },
    };
  });

export const previewHarnessPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: HarnessPolicyInput) => input)
  .handler(async ({ data }) => evaluateHarnessPolicy(data));

export const previewSubagentSpawn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: SubagentSpawnInput) => input)
  .handler(async ({ data }) => evaluateSubagentSpawn(data));
