import type { ToolDef } from "@/lib/runtime/model-gateway.server";
import type { ToolContext } from "@/lib/runtime/tools.server";
import { loadProgressiveSkillContext } from "./skill-context.server";
import { queueSkillScriptApproval } from "./skill-script-approval.server";
import { inheritedAgentToolNames } from "./skill-script-policy";

type Sb = { from: (table: string) => any };

export const SKILL_SCRIPT_TOOL_DEF: ToolDef = {
  name: "skill_script",
  description:
    "Discover security-scanned reusable playbooks relevant to the task, or request operator approval to run one declared JSON recipe. Use action=discover before action=run when the exact skill/recipe is not already known. Recipes can only bundle bounded read/internal tools; external writes, browser control, purchases and code execution require their own native controls.",
  parameters: {
    type: "object",
    properties: {
      action: { type: "string", enum: ["discover", "run"] },
      query: {
        type: "string",
        description: "Task or capability description used to rank reusable skills during discovery.",
      },
      skill: {
        type: "string",
        description: "Exact reusable skill name returned by discover.",
      },
      script: {
        type: "string",
        description: "Exact declared .json recipe filename returned by discover.",
      },
      params: {
        type: "object",
        description: "Optional bounded non-secret scalar parameters referenced by the recipe.",
      },
    },
    required: ["action"],
  },
};

function scalarParams(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

async function discoverSkills(sb: Sb, ctx: ToolContext, query: string) {
  const { data: agent, error } = await sb
    .from("personal_agents")
    .select("allowed_tools")
    .eq("id", ctx.agentId)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (error || !agent) return { error: "Could not resolve this agent's current skill permissions." };
  const granted = inheritedAgentToolNames(
    Array.isArray(agent.allowed_tools)
      ? agent.allowed_tools.filter((tool: unknown): tool is string => typeof tool === "string")
      : [],
  );
  const context = await loadProgressiveSkillContext({
    sb,
    userId: ctx.userId,
    input: query,
    grantedTools: granted,
  });
  return {
    count: context.index.length,
    skills: context.index.map((skill) => ({
      name: skill.name,
      version: skill.version,
      description: skill.description,
      required_tools: skill.requiresTools,
      recipes: skill.requiresScripts,
      selected: context.selected.some((item) => item.id === skill.id),
      playbook: context.selected.find((item) => item.id === skill.id)?.body ?? null,
    })),
    note: "Playbooks are guidance only. Running a declared recipe creates an immutable operator approval request before any recipe step can execute.",
  };
}

export async function runSkillScriptTool(
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<unknown> {
  const sb = ctx.sb as unknown as Sb;
  const action = input["action"] === "run" ? "run" : "discover";
  if (action === "discover") {
    const query = typeof input["query"] === "string" ? input["query"].trim().slice(0, 2_000) : "";
    if (!query) return { error: "Describe the task or capability to discover a reusable skill." };
    try {
      return await discoverSkills(sb, ctx, query);
    } catch (error) {
      return { error: error instanceof Error ? error.message.slice(0, 500) : "Could not discover reusable skills." };
    }
  }

  const skillName = typeof input["skill"] === "string" ? input["skill"].trim().slice(0, 120) : "";
  const script = typeof input["script"] === "string" ? input["script"].trim().slice(0, 80) : "";
  if (!skillName || !script) return { error: "An exact skill name and declared recipe filename are required." };

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
