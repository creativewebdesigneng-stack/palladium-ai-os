import type { ToolDef } from "@/lib/runtime/model-gateway.server";
import type { ToolContext } from "@/lib/runtime/tools.server";
import { queueSkillScriptApproval } from "./skill-script-approval.server";

type Sb = { from: (table: string) => any };

export const SKILL_SCRIPT_TOOL_DEF: ToolDef = {
  name: "skill_script",
  description:
    "Request operator approval to run one declared JSON recipe from an enabled reusable skill. Recipes can only bundle bounded read/internal tools; external writes, browser control, purchases and code execution require their own native controls.",
  parameters: {
    type: "object",
    properties: {
      skill: {
        type: "string",
        description: "Exact reusable skill name shown in the active playbook context.",
      },
      script: {
        type: "string",
        description: "Exact declared .json recipe filename shown by the playbook.",
      },
      params: {
        type: "object",
        description: "Optional bounded non-secret scalar parameters referenced by the recipe.",
      },
    },
    required: ["skill", "script"],
  },
};

function scalarParams(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export async function runSkillScriptTool(
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<unknown> {
  const skillName = typeof input["skill"] === "string" ? input["skill"].trim().slice(0, 120) : "";
  const script = typeof input["script"] === "string" ? input["script"].trim().slice(0, 80) : "";
  if (!skillName || !script) return { error: "An exact skill name and declared recipe filename are required." };

  const sb = ctx.sb as unknown as Sb;
  const { data: skill, error } = await sb
    .from("agent_skills")
    .select("id,name,enabled,scan_verdict")
    .eq("user_id", ctx.userId)
    .eq("name", skillName)
    .maybeSingle();
  if (error || !skill) return { error: "That reusable skill is not installed for this operator." };
  if (!skill.enabled || skill.scan_verdict === "dangerous") {
    return { error: "That reusable skill is disabled or blocked by its security scan." };
  }

  try {
    return await queueSkillScriptApproval({
      sb,
      userId: ctx.userId,
      orgId: ctx.orgId,
      agentId: ctx.agentId,
      taskId: ctx.taskId,
      skillId: skill.id,
      script,
      params: scalarParams(input["params"]),
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message.slice(0, 500) : "Could not prepare that skill recipe." };
  }
}
