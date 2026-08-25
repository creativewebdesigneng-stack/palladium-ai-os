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
import { getEntitlements } from "@/lib/platform/entitlements.server";
import { executeTool, resolveGrantedTools, TOOL_MANIFEST } from "@/lib/runtime/tools.server";
import { browserProviderStatus } from "@/lib/mission/browser-agent";

type Sb = { from: (t: string) => any; rpc: (fn: string, args?: Record<string, unknown>) => any };

/* ------------------------------------------------------------------ catalogue */

export const getToolFramework = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;

    const [catalogue, permissions, executions, agents, ent] = await Promise.all([
      sb.from("tools").select("*").order("category", { ascending: true }),
      sb.from("tool_permissions").select("*"),
      sb.from("tool_executions").select("*").order("created_at", { ascending: false }).limit(60),
      sb.from("personal_agents").select("id,name,allowed_tools,requires_approval,status"),
      getEntitlements(sb as never, userId, null),
    ]);

    const browser = await browserProviderStatus();

    const executable = new Set(TOOL_MANIFEST.map((t) => t.slug));

    return {
      plan: ent.planCode,
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

    const { data: existing } = await sb
      .from("tool_permissions")
      .select("id")
      .eq("tool", data.tool)
      .is("agent_id", data.agentId ? undefined : null)
      .limit(1);

    const match = data.agentId
      ? (
          await sb
            .from("tool_permissions")
            .select("id")
            .eq("tool", data.tool)
            .eq("agent_id", data.agentId)
            .maybeSingle()
        ).data
      : existing?.[0];

    const result = match
      ? await sb.from("tool_permissions").update(row).eq("id", match.id).select("*").maybeSingle()
      : await sb.from("tool_permissions").insert(row).select("*").maybeSingle();

    if (result.error) throw new Error("Could not save that tool permission.");

    await sb.from("mission_audit_logs").insert({
      user_id: userId,
      action: "tool_permission_updated",
      target_type: "tool",
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
      .maybeSingle();
    if (!agent) throw new Error("That agent is not available to you.");

    const orgId = agent.org_id_fk ?? agent.org_id ?? null;
    const ent = await getEntitlements(sb as never, userId, orgId);
    const { grants } = await resolveGrantedTools(sb, agent, ent.planCode);
    const grant = grants.get(data.tool);
    if (!grant)
      throw new Error(`"${data.tool}" is not enabled for ${agent.name} on your current plan.`);

    // nango_action performs its own schema-aware risk classification and queues
    // an immutable provider/action payload when this grant requires approval.
    if (grant.requiresApproval && data.tool !== "nango_action") {
      const { data: approval } = await sb
        .from("approval_requests")
        .insert({
          user_id: userId,
          org_id: orgId,
          agent_id: agent.id,
          action_type: data.tool,
          title: `Approve ${data.tool} run`,
          summary: `Manual ${data.tool} invocation requested for ${agent.name}.`,
          details: { tool: data.tool, input: data.input ?? {} },
          risk_level: "high",
          status: "pending",
        })
        .select("id")
        .maybeSingle();
      return {
        status: "awaiting_approval" as string,
        approvalRequestId: (approval?.id as string | null) ?? null,
        outputJson: null as string | null,
      };
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

    return {
      status: (result.ok ? "succeeded" : "failed") as string,
      approvalRequestId: null as string | null,
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
