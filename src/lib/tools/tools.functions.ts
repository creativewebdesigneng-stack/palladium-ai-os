/**
 * Server functions for the tool framework.
 *
 * Every entry point runs the same five checks before a tool can execute:
 * authenticated user, organisation membership (RLS), agent ownership,
 * subscription plan, and the tool permission row. Every attempt is written to
 * `tool_executions`.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/lib/platform/audit.server";
import { getEntitlements } from "@/lib/platform/entitlements.server";
import { executeTool, resolveGrantedTools, TOOL_MANIFEST } from "@/lib/runtime/tools.server";
import { browserProviderStatus } from "@/lib/mission/browser-agent";
import { toolExecutionEvidence } from "./tool-execution-evidence";
import { normalizeHarnessDomain, normalizeHarnessDomains } from "@/lib/runtime/agent-harness";

type Sb = { from: (t: string) => any; rpc: (fn: string, args?: Record<string, unknown>) => any };

/* ------------------------------------------------------------------ catalogue */

/** Read only the existing executable catalogue; selecting a tool grants nothing. */
export const listAgentToolChoices = createServerFn({method: "POST"})
  .middleware([requireSupabaseAuth])
  .handler(async ({context}) => {
    const sb=context.supabase as unknown as Sb;
    const {data,error}=await sb.from("tools").select("slug,name,description,is_active,min_plan,category").eq("is_active",true).order("name",{ascending:true});
    if(error) throw new Error("Could not load the executable tool catalogue.");
    const executable=new Set(TOOL_MANIFEST.map(t=>t.slug));
    return (data??[]).filter((t:any)=>executable.has(t.slug)).map((t:any)=>({...t,executable:true}));
  });

export const getToolFramework = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;

    const [catalogue, permissions, executions, agents, ent, approvals] = await Promise.all([
      sb.from("tools").select("*").order("category", { ascending: true }),
      sb.from("tool_permissions").select("*").eq("user_id", userId),
      sb.from("tool_executions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(60),
      sb.from("personal_agents").select("id,name,allowed_tools,requires_approval,status").eq("user_id", userId),
      getEntitlements(sb as never, userId, null),
      // Owner-scoped browser and bounded local-task receipts are inspected server-side
      // only; never return private inputs or original output to the diagnostics UI.
      sb.from("approval_requests")
        .select("action_type,status,execution_status,agent_id,details,execution_result")
        .eq("user_id", userId).in("action_type", ["agent_browser_task", "agent_tool_task"])
        .order("created_at", { ascending: false }).limit(120),
    ]);

    if (catalogue.error || permissions.error || agents.error || executions.error || approvals.error) {
      throw new Error("Could not load tool configuration and permissions or execution evidence.");
    }

    const browser = await browserProviderStatus();

    const executable = new Set(TOOL_MANIFEST.map((t) => t.slug));
    const toolEvidence = toolExecutionEvidence(
      (catalogue.data ?? []).map((row: any) => ({
        slug: row.slug, is_active: row.is_active, executable: executable.has(row.slug),
      })),
      executions.data ?? [],
      approvals.data ?? [],
    );

    return {
      plan: ent.planCode,
      toolEvidence,
      toolEvidenceScope: "recent_60_executions" as const,
      tools: (catalogue.data ?? []).map((t: any) => ({
        ...t,
        executable: executable.has(t.slug),
        permission:
          (permissions.data ?? []).find((p: any) => p.tool === t.slug && !p.agent_id) ?? null,
      })),
      permissions: permissions.data ?? [],
      executions: executions.data ?? [],
      agents: agents.data ?? [],
      browser,
    };
  });

/**
 * Read-only, task-scoped network certification check for the authenticated
 * operator. Reuse the Tool Framework's existing evidence classifier; neither
 * approval requests nor tool executions are created, updated or returned raw.
 */
export const getGovernedReadEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { taskId: string; tool: string }) => {
    const tool = String(input?.tool ?? "");
    const taskId = String(input?.taskId ?? "");
    if (!["web_search", "web_fetch", "http_request"].includes(tool) ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId)) {
      throw new Error("A valid network QA tool and task ID are required.");
    }
    return { tool, taskId };
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;
    const { data: task, error: taskError } = await sb.from("agent_tasks")
      .select("id,agent_id,status").eq("id", data.taskId)
      .eq("user_id", userId).maybeSingle();
    if (taskError || !task || !task.agent_id) throw new Error("That agent task is not available to you.");

    const [runs, receipts, catalogue] = await Promise.all([
      sb.from("tool_executions").select("agent_task_id,agent_id,tool,status,input,output,created_at")
        .eq("user_id", userId).eq("agent_id", task.agent_id)
        .eq("agent_task_id", task.id).eq("tool", data.tool)
        .order("created_at", { ascending: false }).limit(25),
      sb.from("approval_requests").select("action_type,status,execution_status,agent_id,details,execution_result")
        .eq("user_id", userId).eq("agent_id", task.agent_id)
        .eq("action_type", "agent_tool_task")
        .contains("details", { agent_task_id: task.id, tool: data.tool })
        .order("created_at", { ascending: false }).limit(25),
      sb.from("tools").select("slug,is_active").eq("slug", data.tool).maybeSingle(),
    ]);
    if (runs.error || receipts.error || catalogue.error) {
      throw new Error("Could not verify the original task, tool execution and approval receipts.");
    }
    const evidence = toolExecutionEvidence([{
      slug: data.tool,
      is_active: catalogue.data?.is_active === true,
      executable: TOOL_MANIFEST.some(row => row.slug === data.tool),
    }], runs.data ?? [], receipts.data ?? [])[0];
    // A receipt alone is insufficient if the original task never finished.
    const verified = task.status === "succeeded" && evidence?.state === "network_verified";
    return {
      taskId: task.id,
      tool: data.tool,
      taskStatus: task.status,
      evidenceState: evidence?.state ?? "not_tested",
      verified,
      attempts: evidence?.observedAttempts ?? 0,
      approvalPending: (receipts.data ?? []).some((row: any) => row.status === "pending"),
    };
  });

/* ----------------------------------------------------------------- permissions */

export const saveToolPermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      tool: string;
      agentId?: string | null;
      enabled?: boolean;
      requiresApproval?: boolean;
      allowedDomains?: string[];
      spendCap?: number | null;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;

    const { data: tool } = await sb
      .from("tools")
      .select("slug,is_active,min_plan,requires_approval")
      .eq("slug", data.tool)
      .maybeSingle();
    if (!tool) throw new Error("Unknown tool.");

    if (data.agentId) {
      const { data: agent } = await sb
        .from("personal_agents")
        .select("id")
        .eq("id", data.agentId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!agent) throw new Error("That agent is not available to you.");
    }

    // A partial edit must preserve existing controls. Never disable approval,
    // clear network restrictions, or remove spend caps just because the client
    // changed a different field.
    let query = sb.from("tool_permissions")
      .select("id,enabled,requires_approval,allowed_domains,spend_cap")
      .eq("tool", data.tool).eq("user_id", userId);
    query = data.agentId ? query.eq("agent_id", data.agentId) : query.is("agent_id", null);
    const { data: match, error: lookupError } = await query.maybeSingle();
    if (lookupError) throw new Error("Could not load the existing tool permission.");

    if (data.allowedDomains !== undefined &&
        (!Array.isArray(data.allowedDomains) ||
         data.allowedDomains.length > 50 ||
         data.allowedDomains.some(domain => normalizeHarnessDomain(domain) === null))) {
      throw new Error("Tool domain restrictions must contain at most 50 valid HTTP(S) hosts.");
    }
    const domains = data.allowedDomains !== undefined
      ? normalizeHarnessDomains(data.allowedDomains)
      : (match?.allowed_domains ?? []);
    if (data.spendCap !== undefined && data.spendCap !== null &&
        (!Number.isFinite(data.spendCap) || data.spendCap < 0)) {
      throw new Error("Spend caps must be finite nonnegative amounts.");
    }

    const row = {
      user_id: userId,
      agent_id: data.agentId ?? null,
      tool: data.tool,
      enabled: data.enabled ?? match?.enabled ?? true,
      requires_approval: data.requiresApproval ?? match?.requires_approval ?? tool.requires_approval ?? true,
      allowed_domains: domains,
      spend_cap: data.spendCap !== undefined ? data.spendCap : match?.spend_cap ?? null,
    };

    const result = match
      ? await sb.from("tool_permissions").update(row).eq("id", match.id).eq("user_id", userId).select("*").maybeSingle()
      : await sb.from("tool_permissions").insert(row).select("*").maybeSingle();

    if (result.error || !result.data) throw new Error("Could not save that tool permission.");

    await writeAudit({
      userId: userId,
      action: "tool_permission_updated",
      targetType: "tool",
      status: "success",
      metadata: { tool: data.tool, agent_id: data.agentId ?? null, enabled: row.enabled },
    });

    return result.data;
  });

/* ------------------------------------------------------------------- execution */

export const runToolManually = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { agentId: string; tool: string; input?: Record<string, unknown> }) => input,
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;

    const { data: agent } = await sb
      .from("personal_agents")
      .select("id,name,allowed_tools,allowed_providers,requires_approval,org_id,org_id_fk,status")
      .eq("id", data.agentId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!agent) throw new Error("That agent is not available to you.");

    const orgId = agent.org_id_fk ?? agent.org_id ?? null;
    const ent = await getEntitlements(sb as never, userId, orgId);
    const { grants } = await resolveGrantedTools(sb, agent, ent.planCode);
    const grant = grants.get(data.tool);
    if (!grant)
      throw new Error(`"${data.tool}" is not enabled for ${agent.name} on your current plan.`);

    // A manual test has no durable agent task to resume. Creating a generic
    // approval here produces an unexecutable request and false assurance.
    // Read-only tools may run; both aliases of the provider-neutral connector
    // dispatcher queue immutable, independently executable approval payloads.
    if (grant.requiresApproval && !["nango_action", "integration_action"].includes(data.tool)) {
      throw new Error(
        "This tool requires operator approval and cannot be run from the manual tester. Start an agent task so its action and approval can be resumed and audited.",
      );
    }

    const result = await executeTool(
      data.tool,
      data.input ?? {},
      {
        userId,
        orgId,
        agentId: agent.id,
        taskId: null,
        sb,
        allowedProviders: agent.allowed_providers ?? [],
      },
      grants,
    );

    const output = result.output && typeof result.output === "object" && !Array.isArray(result.output)
      ? result.output as Record<string, unknown> : null;
    const receiptId = typeof output?.["approval_request_id"] === "string" ? output["approval_request_id"] : null;
    const awaiting = Boolean(receiptId && (
      output?.["requires_approval"] === true || output?.["queued"] === true ||
      output?.["status"] === "awaiting_approval" || output?.["status"] === "pending"
    ));
    return {
      status: (awaiting ? "awaiting_approval" : result.ok ? "succeeded" : "failed") as string,
      approvalRequestId: receiptId,
      outputJson: JSON.stringify(result.output ?? null),
    };
  });

export const listToolExecutions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tool?: string; limit?: number }) => input)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    if (data.limit !== undefined && (!Number.isInteger(data.limit) || data.limit < 1 || data.limit > 200))
      throw new Error("Execution history limit must be between 1 and 200.");
    let query = sb
      .from("tool_executions")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 50);
    if (data.tool) query = query.eq("tool", data.tool);
    const { data: rows, error } = await query;
    if (error) throw new Error("Could not load your tool execution history.");
    return rows ?? [];
  });
