import { getEntitlements } from "@/lib/platform/entitlements.server";
import { executeTool, resolveGrantedTools } from "@/lib/runtime/tools.server";
import { replayApprovedSkillScript } from "./skill-script-approval.server";
import { isSkillScriptToolSafe } from "./skill-script-policy";

type Sb = { from: (table: string) => any };

type ApprovedSkillScriptActionArgs = {
  sb: Sb;
  userId: string;
  approvalRequestId: string;
  agentId: string;
  orgId: string | null;
};

export async function executeApprovedSkillScriptAction(args: ApprovedSkillScriptActionArgs): Promise<{
  ok: boolean;
  provider: "palladium";
  result?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const { data: agent, error: agentError } = await args.sb
      .from("personal_agents")
      .select("id,allowed_tools,allowed_providers,requires_approval")
      .eq("id", args.agentId)
      .eq("user_id", args.userId)
      .maybeSingle();
    if (agentError || !agent) throw new Error("The approved skill's agent is no longer available.");

    const entitlements = await getEntitlements(args.sb as never, args.userId, args.orgId);
    const resolved = await resolveGrantedTools(
      args.sb,
      {
        id: agent.id,
        allowed_tools: Array.isArray(agent.allowed_tools) ? agent.allowed_tools : [],
        requires_approval: agent.requires_approval === true,
      },
      entitlements.planCode,
    );

    // A bundled recipe can use only currently granted low-risk tools. A tool
    // that now requires approval is deliberately removed so policy changes made
    // after the human approved the recipe take effect before any step executes.
    const allowedTools = new Set(
      [...resolved.grants.entries()]
        .filter(([tool, grant]) => isSkillScriptToolSafe(tool) && !grant.requiresApproval)
        .map(([tool]) => tool),
    );

    const replay = await replayApprovedSkillScript({
      sb: args.sb,
      userId: args.userId,
      approvalRequestId: args.approvalRequestId,
      allowedTools,
      execute: (tool, input) =>
        executeTool(
          tool,
          input,
          {
            userId: args.userId,
            orgId: args.orgId,
            agentId: agent.id,
            taskId: null,
            sb: args.sb,
            allowedProviders: Array.isArray(agent.allowed_providers)
              ? agent.allowed_providers.filter((provider: unknown): provider is string => typeof provider === "string")
              : [],
          },
          resolved.grants,
        ),
    });

    const execution = replay.execution as Record<string, unknown>;
    const status = typeof execution["status"] === "string" ? execution["status"] : "failed";
    const ok = status === "succeeded";
    return {
      ok,
      provider: "palladium",
      result: {
        execution_id: execution["id"] ?? null,
        status,
        already_claimed: replay.already_claimed,
      },
      ...(ok ? {} : { error: typeof execution["error"] === "string" ? execution["error"] : "Approved skill script did not complete successfully." }),
    };
  } catch (error) {
    return {
      ok: false,
      provider: "palladium",
      error: error instanceof Error ? error.message.slice(0, 500) : "Approved skill script failed.",
    };
  }
}
