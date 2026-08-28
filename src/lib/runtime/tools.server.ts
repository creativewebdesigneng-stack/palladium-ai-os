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
import { SOCIAL_OPS_TOOL_DEF, runSocialOpsTool } from "@/lib/social/social-agent-tool.server";
import { assertHarnessToolInput } from "./agent-harness";

export type { ToolContext, ToolGrant } from "./tools-core.server";

const LOCAL_TOOL_DEFS = [SKILL_SCRIPT_TOOL_DEF, SOCIAL_OPS_TOOL_DEF] as const;
const LOCAL_TOOL_NAMES = new Set(LOCAL_TOOL_DEFS.map((item) => item.name));

export const TOOL_SLUGS = [...CORE_TOOL_SLUGS, "skill_script", "social_ops"];
export const TOOL_MANIFEST = [
  ...CORE_TOOL_MANIFEST,
  {
    slug: "skill_script",
    description: SKILL_SCRIPT_TOOL_DEF.description,
    sensitive: false,
  },
  {
    slug: "social_ops",
    description: SOCIAL_OPS_TOOL_DEF.description,
    sensitive: false,
  },
];

const PLAN_RANK: Record<string, number> = {
  explorer: 0,
  builder: 1,
  business: 2,
  enterprise: 3,
};

/** Extends the stable PalladiumAI registry with bounded local capability tools. */
export async function resolveGrantedTools(
  sb: { from: (table: string) => any },
  agent: { id: string; allowed_tools?: string[] | null; requires_approval?: boolean | null },
  plan: string = "explorer",
): Promise<{ defs: ToolDef[]; grants: Map<string, ToolGrant> }> {
  const core = await resolveCoreGrantedTools(sb, agent, plan);
  const allowedTools = new Set(agent.allowed_tools ?? []);
  const requested = LOCAL_TOOL_DEFS.filter((def) => allowedTools.has(def.name));
  if (!requested.length) return core;

  const names = requested.map((def) => def.name);
  const [{ data: permissions }, { data: catalogue }] = await Promise.all([
    sb
      .from("tool_permissions")
      .select("tool,enabled,requires_approval,allowed_domains,spend_cap,agent_id")
      .in("tool", names),
    sb
      .from("tools")
      .select("slug,is_active,min_plan,requires_approval")
      .in("slug", names),
  ]);

  const grants = new Map(core.grants);
  const defs = [...core.defs];
  for (const def of requested) {
    const entry = (catalogue ?? []).find((row: any) => row.slug === def.name);
    if (entry?.is_active === false) continue;
    if (entry?.min_plan && (PLAN_RANK[plan] ?? 0) < (PLAN_RANK[String(entry.min_plan)] ?? 0)) continue;

    const rows = (permissions ?? []).filter((row: any) => row.tool === def.name);
    const permission = rows.find((row: any) => row.agent_id === agent.id) ?? rows.find((row: any) => !row.agent_id);
    if (permission?.enabled === false) continue;

    grants.set(def.name, {
      slug: def.name,
      requiresApproval: false,
      allowedDomains: [],
      spendCap: null,
    });
    defs.push(def);
  }
  return { defs, grants };
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

/** Local extension tools retain one narrow wrapper and the existing Harness/audit choke point. */
export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
  grants: Map<string, ToolGrant>,
): Promise<{ ok: boolean; output: unknown }> {
  if (!LOCAL_TOOL_NAMES.has(name)) return executeCoreTool(name, input, ctx, grants);

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
    return { ok: false, output: { error: harness.reason, policy_code: harness.code } };
  }

  try {
    const output = name === "skill_script"
      ? await runSkillScriptTool(input, { ...ctx, allowedDomains: [], spendCap: null, requiresApproval: false })
      : await runSocialOpsTool(input, { ...ctx, allowedDomains: [], spendCap: null, requiresApproval: false });
    await log("succeeded", { output: outputMetadata(output) as never });
    return { ok: true, output };
  } catch (error) {
    const message = error instanceof Error ? error.message : `${name} execution failed.`;
    await log("failed", { error: message.slice(0, 500) });
    return { ok: false, output: { error: message.slice(0, 300) } };
  }
}
