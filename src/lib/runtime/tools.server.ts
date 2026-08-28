import type { ToolDef } from "./model-gateway.server";
import {
  TOOL_MANIFEST as CORE_TOOL_MANIFEST,
  TOOL_SLUGS as CORE_TOOL_SLUGS,
  executeTool as executeCoreTool,
  resolveGrantedTools as resolveCoreGrantedTools,
  type ToolContext,
  type ToolGrant,
} from "./tools-core.server";
import {
  SKILL_SCRIPT_TOOL_DEF,
  runSkillScriptTool,
} from "./agent-skills/skill-script-tool.server";
import {
  APP_STUDIO_TOOL_DEF,
  runAppStudioTool,
} from "@/lib/app-studio/app-studio-agent-tool.server";
import { assertHarnessToolInput } from "./agent-harness";

export type { ToolContext, ToolGrant } from "./tools-core.server";

export const TOOL_SLUGS = [...CORE_TOOL_SLUGS, "skill_script"];
export const TOOL_MANIFEST = [
  ...CORE_TOOL_MANIFEST.map((tool) =>
    tool.slug === "app_studio"
      ? { ...tool, description: APP_STUDIO_TOOL_DEF.description }
      : tool,
  ),
  {
    slug: "skill_script",
    description: SKILL_SCRIPT_TOOL_DEF.description,
    sensitive: false,
  },
];

const PLAN_RANK: Record<string, number> = {
  explorer: 0,
  builder: 1,
  business: 2,
  enterprise: 3,
};

/**
 * Extends the stable PalladiumAI tool registry with Atomic-style reusable skills.
 * The skill tool is local and self-queues immutable approvals, so it never
 * bypasses the existing core tool/Harness policy layer.
 */
export async function resolveGrantedTools(
  sb: { from: (table: string) => any },
  agent: { id: string; allowed_tools?: string[] | null; requires_approval?: boolean | null },
  plan: string = "explorer",
): Promise<{ defs: ToolDef[]; grants: Map<string, ToolGrant> }> {
  const core = await resolveCoreGrantedTools(sb, agent, plan);
  const allowedTools = new Set(agent.allowed_tools ?? []);
  if (!allowedTools.has("skill_script")) {
    return {
      defs: core.defs.map((definition) =>
        definition.name === "app_studio" ? APP_STUDIO_TOOL_DEF : definition,
      ),
      grants: core.grants,
    };
  }

  const [{ data: permissions }, { data: catalogue }] = await Promise.all([
    sb
      .from("tool_permissions")
      .select("tool,enabled,requires_approval,allowed_domains,spend_cap,agent_id")
      .eq("tool", "skill_script"),
    sb
      .from("tools")
      .select("slug,is_active,min_plan,requires_approval")
      .eq("slug", "skill_script"),
  ]);

  const entry = (catalogue ?? []).find((row: any) => row.slug === "skill_script");
  if (entry?.is_active === false) {
    return {
      defs: core.defs.map((definition) =>
        definition.name === "app_studio" ? APP_STUDIO_TOOL_DEF : definition,
      ),
      grants: core.grants,
    };
  }
  if (entry?.min_plan && (PLAN_RANK[plan] ?? 0) < (PLAN_RANK[String(entry.min_plan)] ?? 0)) {
    return {
      defs: core.defs.map((definition) =>
        definition.name === "app_studio" ? APP_STUDIO_TOOL_DEF : definition,
      ),
      grants: core.grants,
    };
  }

  const rows = (permissions ?? []).filter((row: any) => row.tool === "skill_script");
  const permission =
    rows.find((row: any) => row.agent_id === agent.id) ??
    rows.find((row: any) => !row.agent_id);
  if (permission?.enabled === false) {
    return {
      defs: core.defs.map((definition) =>
        definition.name === "app_studio" ? APP_STUDIO_TOOL_DEF : definition,
      ),
      grants: core.grants,
    };
  }

  const grants = new Map(core.grants);
  grants.set("skill_script", {
    slug: "skill_script",
    // Discovery is read-only and action=run creates its own immutable approval.
    // Keeping this false prevents generic approval interception before the exact
    // skill/version/script/params fingerprint can be stored.
    requiresApproval: false,
    allowedDomains: [],
    spendCap: null,
  });
  return {
    defs: [
      ...core.defs.map((definition) =>
        definition.name === "app_studio" ? APP_STUDIO_TOOL_DEF : definition,
      ),
      SKILL_SCRIPT_TOOL_DEF,
    ],
    grants,
  };
}

function inputMetadata(input: Record<string, unknown>): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (/(token|secret|password|passwd|api[_-]?key|authorization|cookie|card|cvv|iban|ssn)/i.test(key)) {
      metadata[key] = "[redacted]";
    } else if (typeof value === "string") {
      metadata[key] = value.length > 200 ? `${value.slice(0, 200)}…(${value.length} chars)` : value;
    } else if (Array.isArray(value)) {
      metadata[key] = { type: "array", length: value.length };
    } else if (value && typeof value === "object") {
      metadata[key] = { type: "object", keys: Object.keys(value as object).slice(0, 12) };
    } else {
      metadata[key] = value;
    }
  }
  return metadata;
}

function outputMetadata(output: unknown): unknown {
  const text = JSON.stringify(output ?? null);
  return text.length > 4_000 ? { truncated: true, bytes: text.length } : output;
}

/**
 * Skill execution and App Studio's expanded draft builder use narrow wrapper
 * entry points. Every other tool is sent through the unchanged core executor.
 */
export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
  grants: Map<string, ToolGrant>,
): Promise<{ ok: boolean; output: unknown }> {
  if (name !== "skill_script" && name !== "app_studio") {
    return executeCoreTool(name, input, ctx, grants);
  }

  const grant = grants.get(name);
  const started = Date.now();
  const log = async (
    status: "succeeded" | "failed" | "cancelled",
    extra: Record<string, unknown>,
  ) => {
    await ctx.sb.from("tool_executions").insert({
      user_id: ctx.userId,
      org_id: ctx.orgId,
      agent_id: ctx.agentId,
      agent_task_id: ctx.taskId || null,
      tool: name,
      input: inputMetadata(input),
      status,
      duration_ms: Date.now() - started,
      ...extra,
    });
  };

  if (!grant) {
    await log("failed", { error: "Tool not enabled for this agent." });
    return { ok: false, output: { error: `Tool "${name}" is not enabled for this agent.` } };
  }

  const harness = assertHarnessToolInput(name, input, grant.allowedDomains);
  if (harness.decision === "deny") {
    await log("failed", { error: harness.reason, policy_code: harness.code });
    return {
      ok: false,
      output: { error: harness.reason, policy_code: harness.code },
    };
  }

  if (name === "app_studio" && grant.requiresApproval) {
    await log("failed", { error: "App Studio draft editing requires explicit approval under this agent policy." });
    return {
      ok: false,
      output: {
        error: "App Studio is configured to require explicit operator approval for this agent.",
        requires_approval: true,
        suggested_tool: "request_approval",
      },
    };
  }

  try {
    const output = name === "skill_script"
      ? await runSkillScriptTool(input, {
          ...ctx,
          allowedDomains: [],
          spendCap: null,
          requiresApproval: false,
        })
      : await runAppStudioTool(input, {
          userId: ctx.userId,
          orgId: ctx.orgId,
          sb: ctx.sb,
        });
    await log("succeeded", { output: outputMetadata(output) as never });
    return { ok: true, output };
  } catch (error) {
    const message = error instanceof Error ? error.message : `${name} tool execution failed.`;
    await log("failed", { error: message.slice(0, 500) });
    return { ok: false, output: { error: message.slice(0, 300) } };
  }
}
