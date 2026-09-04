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
    const [agents, tasks, approvals, tools, permissions, executions, identities, delegations, a2a] = await Promise.all([
      sb.from("personal_agents").select("id,name,status,allowed_tools,requires_approval").order("created_at", { ascending: false }).limit(50),
      sb.from("agent_tasks").select("id,agent_id,status,created_at,completed_at,error").order("created_at", { ascending: false }).limit(50),
      sb.from("approval_requests").select("id,agent_id,action_type,title,risk_level,status,created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(25),
      sb.from("tools").select("slug,name,category,is_active").order("category", { ascending: true }),
      sb.from("tool_permissions").select("tool,agent_id,enabled,requires_approval,allowed_domains,spend_cap"),
      sb.from("tool_executions").select("id,tool,status,created_at,duration_ms,agent_id").order("created_at", { ascending: false }).limit(30),
      sb.from("agent_identities").select("id,agent_id,status,trust_tier,canonical_id").order("created_at", { ascending: false }).limit(100),
      sb.from("agent_delegation_grants").select("id,status,requires_approval,allow_external_actions,expires_at").order("created_at", { ascending: false }).limit(100),
      sb.from("agent_a2a_messages").select("id,status,requires_approval,kind,created_at").order("created_at", { ascending: false }).limit(100),
    ]);

    const agentRows = agents.data ?? [];
    const taskRows = tasks.data ?? [];
    const permissionRows = permissions.data ?? [];
    const identityRows = identities.data ?? [];
    const delegationRows = delegations.data ?? [];
    const a2aRows = a2a.data ?? [];
    const runningStates = new Set(["pending", "queued", "running", "waiting_for_tool", "waiting_for_approval"]);
    const liveA2aStates = new Set(["queued", "pending_approval", "delivered"]);

    return {
      capabilities: HARNESS_CAPABILITIES,
      stats: {
        agents: agentRows.length,
        activeAgents: agentRows.filter((agent: any) => agent.status === "active" || agent.status === "online").length,
        liveRuns: taskRows.filter((task: any) => runningStates.has(task.status)).length,
        pendingApprovals: (approvals.data ?? []).length,
        enabledToolGrants: permissionRows.filter((permission: any) => permission.enabled !== false).length,
        trustedIdentities: identityRows.filter((identity: any) => identity.status === "active").length,
        activeDelegations: delegationRows.filter((grant: any) => grant.status === "active").length,
        liveA2aMessages: a2aRows.filter((message: any) => liveA2aStates.has(message.status)).length,
      },
      trustFabric: {
        identities: identityRows,
        delegations: delegationRows,
        a2a: a2aRows,
      },
      agents: agentRows,
      tasks: taskRows,
      approvals: approvals.data ?? [],
      tools: tools.data ?? [],
      permissions: permissionRows,
      executions: executions.data ?? [],
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
