import { createHash } from "node:crypto";
import {
  loadOwnedSkillScript,
  normalizeSkillScriptParams,
  runLoadedSkillScript,
  type SkillScriptExecutor,
  type SkillScriptRecipe,
} from "./skill-script-runner.server";
import {
  assertSkillScriptToolsSafe,
  inheritedAgentToolNames,
} from "./skill-script-policy";

type Sb = { from: (table: string) => any };

export type SkillScriptApprovalDetails = {
  kind: "agent_skill_script";
  skill_id: string;
  skill_name: string;
  skill_version: string;
  script: string;
  params: Record<string, string | number | boolean | null>;
  fingerprint: string;
};

const HEX_64 = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9_-]{1,128}$/;

function canonical(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "number") return JSON.stringify(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  }
  return "null";
}

export function skillScriptFingerprint(args: {
  skillId: string;
  skillVersion: string;
  script: string;
  recipe: SkillScriptRecipe;
  params: Record<string, unknown>;
}) {
  return createHash("sha256")
    .update(canonical({
      skill_id: args.skillId,
      skill_version: args.skillVersion,
      script: args.script,
      recipe: args.recipe,
      params: args.params,
    }))
    .digest("hex");
}

function parseDetails(value: unknown): SkillScriptApprovalDetails | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (row["kind"] !== "agent_skill_script") return null;
  const skill_id = typeof row["skill_id"] === "string" && ID.test(row["skill_id"]) ? row["skill_id"] : "";
  const skill_name = typeof row["skill_name"] === "string" ? row["skill_name"].slice(0, 120) : "";
  const skill_version = typeof row["skill_version"] === "string" ? row["skill_version"].slice(0, 80) : "";
  const script = typeof row["script"] === "string" ? row["script"] : "";
  const fingerprint = typeof row["fingerprint"] === "string" && HEX_64.test(row["fingerprint"])
    ? row["fingerprint"]
    : "";
  let params: Record<string, string | number | boolean | null>;
  try {
    params = normalizeSkillScriptParams(
      row["params"] && typeof row["params"] === "object" && !Array.isArray(row["params"])
        ? (row["params"] as Record<string, unknown>)
        : {},
    );
  } catch {
    return null;
  }
  if (!skill_id || !skill_name || !skill_version || !script || !fingerprint) return null;
  return { kind: "agent_skill_script", skill_id, skill_name, skill_version, script, params, fingerprint };
}

async function assertAgentCanQueueRecipe(args: {
  sb: Sb;
  userId: string;
  agentId: string;
  tools: readonly string[];
}) {
  assertSkillScriptToolsSafe(args.tools);
  const { data, error } = await args.sb
    .from("personal_agents")
    .select("id,allowed_tools")
    .eq("id", args.agentId)
    .eq("user_id", args.userId)
    .maybeSingle();
  if (error || !data) throw new Error("The agent for this skill script is not available.");
  const allowed = inheritedAgentToolNames(
    Array.isArray(data.allowed_tools)
      ? data.allowed_tools.filter((tool: unknown): tool is string => typeof tool === "string")
      : [],
  );
  for (const tool of args.tools) {
    if (!allowed.has(tool)) {
      throw new Error(`Skill script tool "${tool}" is not granted to this agent.`);
    }
  }
}

export async function queueSkillScriptApproval(args: {
  sb: Sb;
  userId: string;
  orgId: string | null;
  agentId: string;
  taskId: string | null;
  skillId: string;
  script: string;
  params?: Record<string, unknown>;
}) {
  const loaded = await loadOwnedSkillScript({
    sb: args.sb,
    userId: args.userId,
    skillId: args.skillId,
    script: args.script,
  });
  const recipeTools = [...new Set(loaded.recipe.steps.map((step) => step.tool))];
  await assertAgentCanQueueRecipe({
    sb: args.sb,
    userId: args.userId,
    agentId: args.agentId,
    tools: recipeTools,
  });
  const params = normalizeSkillScriptParams(args.params);
  const fingerprint = skillScriptFingerprint({
    skillId: loaded.skill.id,
    skillVersion: loaded.skill.version,
    script: loaded.script,
    recipe: loaded.recipe,
    params,
  });
  const details: SkillScriptApprovalDetails = {
    kind: "agent_skill_script",
    skill_id: loaded.skill.id,
    skill_name: loaded.skill.name,
    skill_version: loaded.skill.version,
    script: loaded.script,
    params,
    fingerprint,
  };
  const { data, error } = await args.sb
    .from("approval_requests")
    .insert({
      user_id: args.userId,
      org_id: args.orgId,
      agent_id: args.agentId,
      task_id: args.taskId,
      action_type: "agent_skill_script",
      title: `Run skill: ${loaded.skill.name}`.slice(0, 180),
      summary: `Approve the immutable ${loaded.script} recipe from skill ${loaded.skill.name} v${loaded.skill.version}. Every step is still re-checked against the agent's current native tool grants at execution time.`.slice(0, 500),
      details,
      risk_level: "medium",
      status: "pending",
    })
    .select("id,status")
    .maybeSingle();
  if (error || !data) throw new Error("Could not queue the skill script for approval.");
  return {
    queued: true,
    approval_request_id: data.id,
    status: data.status,
    skill_id: loaded.skill.id,
    script: loaded.script,
    fingerprint,
  };
}

export async function replayApprovedSkillScript(args: {
  sb: Sb;
  userId: string;
  approvalRequestId: string;
  execute: SkillScriptExecutor;
  allowedTools: ReadonlySet<string>;
}) {
  const { data: approval, error: approvalError } = await args.sb
    .from("approval_requests")
    .select("id,user_id,org_id,agent_id,task_id,action_type,status,details,expires_at")
    .eq("id", args.approvalRequestId)
    .eq("user_id", args.userId)
    .maybeSingle();
  if (approvalError || !approval) throw new Error("Approved skill script was not found.");
  if (approval.user_id !== args.userId) throw new Error("Only the approval owner can execute this skill script.");
  if (approval.action_type !== "agent_skill_script") throw new Error("That approval is not for a skill script.");
  if (approval.status !== "approved") throw new Error("The skill script has not been approved.");
  if (approval.expires_at && Date.parse(approval.expires_at) <= Date.now()) throw new Error("The skill script approval has expired.");

  const details = parseDetails(approval.details);
  if (!details) throw new Error("The skill script approval payload is invalid.");
  const loaded = await loadOwnedSkillScript({
    sb: args.sb,
    userId: args.userId,
    skillId: details.skill_id,
    script: details.script,
  });
  if (loaded.skill.version !== details.skill_version) throw new Error("The approved skill version has changed.");
  const fingerprint = skillScriptFingerprint({
    skillId: loaded.skill.id,
    skillVersion: loaded.skill.version,
    script: loaded.script,
    recipe: loaded.recipe,
    params: details.params,
  });
  if (fingerprint !== details.fingerprint) throw new Error("The approved skill recipe has changed since approval.");

  const recipeTools = [...new Set(loaded.recipe.steps.map((step) => step.tool))];
  assertSkillScriptToolsSafe(recipeTools);
  for (const tool of recipeTools) {
    if (!args.allowedTools.has(tool)) {
      throw new Error(`Skill script tool "${tool}" is no longer granted to this agent.`);
    }
  }

  const claim = {
    approval_request_id: approval.id,
    user_id: args.userId,
    org_id: approval.org_id ?? null,
    agent_id: approval.agent_id ?? null,
    task_id: approval.task_id ?? null,
    skill_id: loaded.skill.id,
    script_name: loaded.script,
    fingerprint,
    status: "running",
  };
  const { data: claimed, error: claimError } = await args.sb
    .from("agent_skill_script_executions")
    .insert(claim)
    .select("id")
    .maybeSingle();
  if (claimError || !claimed) {
    const { data: existing } = await args.sb
      .from("agent_skill_script_executions")
      .select("id,status,result,error,completed_at")
      .eq("approval_request_id", approval.id)
      .eq("user_id", args.userId)
      .maybeSingle();
    if (existing) return { already_claimed: true, execution: existing };
    throw new Error("Could not claim the approved skill script for execution.");
  }

  try {
    const result = await runLoadedSkillScript({
      recipe: loaded.recipe,
      params: details.params,
      execute: args.execute,
    });
    const status = result.ok ? "succeeded" : "failed";
    const { error: ledgerError } = await args.sb
      .from("agent_skill_script_executions")
      .update({ status, result, error: result.ok ? null : "One or more native tool steps failed.", completed_at: new Date().toISOString() })
      .eq("id", claimed.id)
      .eq("user_id", args.userId)
      .eq("status", "running");
    if (ledgerError) throw new Error("Skill script completed but its execution ledger could not be finalized.");
    return { already_claimed: false, execution: { id: claimed.id, status, result } };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Skill script execution failed.";
    await args.sb
      .from("agent_skill_script_executions")
      .update({ status: "failed", error: message, completed_at: new Date().toISOString() })
      .eq("id", claimed.id)
      .eq("user_id", args.userId)
      .eq("status", "running");
    throw error;
  }
}
