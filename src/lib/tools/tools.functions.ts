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
      sb.from("tool_permissions").select("*"),
      sb.from("tool_executions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(60),
      sb.from("personal_agents").select("id,name,allowed_tools,requires_approval,status"),
      getEntitlements(sb as never, userId, null),
      // Approval receipts are inspected on the server only. Never return their
      // raw browser evidence or private provider payload to this diagnostics UI.
      sb.from("approval_requests")
        .select("action_type,status,execution_status,execution_result")
        .eq("user_id", userId).eq("action_type", "agent_browser_task")
        .order("created_at", { ascending: false }).limit(60),
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
      .select("slug,is_active,min_plan")
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

    const domains = (data.allowedDomains ?? [])
      .map((d) =>
        d
          .trim()
          .replace(/^https?:\/\//, "")
          .replace(/^www\./, "")
          .replace(/\/.*$/, "")
          .toLowerCase(),
      )
      .filter(Boolean)
      .slice(0, 50);

    const row = {
      user_id: userId,
      agent_id: data.agentId ?? null,
      tool: data.tool,
      enabled: data.enabled ?? true,
      requires_approval: data.requiresApproval ?? false,
      allowed_domains: domains,
      spend_cap: data.spendCap ?? null,
    };

    let query = sb.from("tool_permissions").select("id")
      .eq("tool", data.tool).eq("user_id", userId);
    query = data.agentId ? query.eq("agent_id", data.agentId) : query.is("agent_id", null);
    const { data: match, error: lookupError } = await query.maybeSingle();
    if (lookupError) throw new Error("Could not load the existing tool permission.");

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
    let query = sb
      .from("tool_executions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 50, 200));
    if (data.tool) query = query.eq("tool", data.tool);
    const { data: rows } = await query;
    return rows ?? [];
  });
