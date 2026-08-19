import {
  fallbackOrchestratorPlan,
  normaliseOrchestratorPlan,
  renderCandidateCatalogue,
  shortlistAgents,
  type OrchestratorCandidate,
  type OrchestratorPlan,
} from "@/lib/agents/agent-orchestrator";
import {
  summariseAgentPerformance,
  summariseSimilarPerformance,
  type AgentPerformanceTask,
} from "@/lib/agents/agent-performance";
import { normaliseProvider, resolveModel, runChat, type ChatMessage } from "./model-gateway.server";
import { executeWorkflow } from "./workforce.server";

type Sb = { from: (table: string) => any };

type EligibleAgentRow = OrchestratorCandidate & {
  user_id: string;
  org_id?: string | null;
  org_id_fk?: string | null;
  status?: string | null;
};

export class OrchestratorError extends Error {
  constructor(
    message: string,
    readonly code = "ORCHESTRATOR_ERROR",
    readonly status = 400,
  ) {
    super(message);
  }
}

const extractJsonObject = (text: string): Record<string, unknown> | null => {
  const fenced = text.trim().match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced || text.trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

function orchestrationPrompt(goal: string, candidates: OrchestratorCandidate[]): ChatMessage[] {
  const catalogue = renderCandidateCatalogue(candidates);
  return [
    {
      role: "system",
      content: [
        "You are the PalladiumAI Orchestrator. You plan delegation only; you do not execute tools or claim tasks are complete.",
        "Break the operator goal into the smallest useful set of specialist assignments. Choose only Agent IDs in the catalogue.",
        "Use dependencies only when an assignment truly needs another assignment's output. Independent work should have no dependency so the workforce engine may run it in parallel.",
        "Prefer specialists whose role and skills match the assignment. Recent verified performance and similar-task evidence are supporting signals, not permission to assign an unrelated specialist.",
        "Never expand permissions. Each selected agent will execute through its own tool grants, memory scope, approval rules and verification contract.",
        "Return one JSON object only. Do not include hidden reasoning.",
        'Shape: {"summary":"...","assignments":[{"id":"research","title":"Research market","objective":"...","agent_id":"uuid","depends_on":[],"success_criteria":["..."],"requires_approval":false}]}',
        "Use 1-12 assignments and unique short assignment ids.",
      ].join("\n"),
    },
    {
      role: "user",
      content: `Goal:\n${goal}\n\nAvailable specialists:\n${catalogue}`,
    },
  ];
}

async function attachPerformance(
  sb: Sb,
  agents: EligibleAgentRow[],
  goal: string,
): Promise<EligibleAgentRow[]> {
  if (!agents.length) return agents;
  try {
    const ids = agents.map((agent) => String(agent.id));
    const { data, error } = await sb
      .from("agent_tasks")
      .select("agent_id,status,input,duration_ms,replan_count,verification_state,created_at")
      .in("agent_id", ids)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw error;
    const tasks = (data ?? []) as AgentPerformanceTask[];
    return agents.map((agent) => ({
      ...agent,
      performance: summariseAgentPerformance(String(agent.id), tasks),
      similar_performance: summariseSimilarPerformance(String(agent.id), goal, tasks),
    }));
  } catch (error) {
    console.error("[orchestrator] performance history unavailable; using skill-only ranking", error);
    return agents;
  }
}

async function loadEligibleAgents(args: {
  sb: Sb;
  userId: string;
  goal: string;
  workforceId?: string | null;
  orgId?: string | null;
}): Promise<{ agents: EligibleAgentRow[]; orgId: string | null; workforceId: string | null }> {
  let workforceId = args.workforceId?.trim() || null;
  let orgId = args.orgId?.trim() || null;
  let allowedIds: Set<string> | null = null;

  if (workforceId) {
    const { data: workforce, error } = await args.sb
      .from("workforces")
      .select("id,user_id,org_id,status")
      .eq("id", workforceId)
      .maybeSingle();
    if (error || !workforce)
      throw new OrchestratorError("Workforce not found or you do not have access to it.", "WORKFORCE_FORBIDDEN", 403);
    if (workforce.status !== "active")
      throw new OrchestratorError("That workforce is not active.", "WORKFORCE_INACTIVE", 409);
    orgId = workforce.org_id ?? null;
    const { data: members, error: memberError } = await args.sb
      .from("workforce_agents")
      .select("agent_id")
      .eq("workforce_id", workforceId);
    if (memberError) throw new OrchestratorError("Could not load workforce agents.", "WORKFORCE_LOAD_FAILED", 500);
    allowedIds = new Set((members ?? []).map((row: any) => String(row.agent_id)));
  }

  const { data, error } = await args.sb
    .from("personal_agents")
    .select("id,user_id,org_id,org_id_fk,name,category,purpose,allowed_tools,model_provider,model,status,operating_profile,spec_version")
    .eq("status", "active")
    .limit(100);
  if (error) throw new OrchestratorError("Could not load available agents.", "AGENT_LOAD_FAILED", 500);

  const visible = (data ?? []) as EligibleAgentRow[];
  const agents = visible.filter((agent) => {
    if (allowedIds && !allowedIds.has(String(agent.id))) return false;
    if (!orgId) return agent.user_id === args.userId;
    const agentOrg = agent.org_id_fk ?? agent.org_id ?? null;
    return agent.user_id === args.userId || agentOrg === orgId;
  });
  if (!agents.length)
    throw new OrchestratorError(
      workforceId ? "That workforce has no active agents available." : "Create or activate an agent before using the Orchestrator.",
      "NO_ELIGIBLE_AGENTS",
      409,
    );
  return { agents: await attachPerformance(args.sb, agents, args.goal), orgId, workforceId };
}

async function createDelegationPlan(goal: string, candidates: EligibleAgentRow[]): Promise<OrchestratorPlan> {
  const shortlist = shortlistAgents(goal, candidates, 12);
  const primary = shortlist[0];
  if (!primary) throw new OrchestratorError("No specialist is available for that goal.", "NO_SPECIALIST", 409);
  const fallback = fallbackOrchestratorPlan(goal, primary);
  const provider = normaliseProvider(primary.model_provider);
  const model = resolveModel(provider, primary.model);

  try {
    const result = await runChat({
      provider,
      model,
      messages: orchestrationPrompt(goal, shortlist),
      tools: [],
      temperature: 0.1,
      maxTokens: 2400,
    });
    const parsed = extractJsonObject(result.text);
    if (!parsed) return fallback;
    const plan = normaliseOrchestratorPlan({ goal, value: parsed, candidates: shortlist });
    return plan.assignments.length ? plan : fallback;
  } catch (error) {
    console.error("[orchestrator] planning failed; using ranked specialist fallback", error);
    return fallback;
  }
}

function generatedWorkflowName(goal: string) {
  const compact = goal.replace(/\s+/g, " ").trim();
  return `Orchestrated · ${compact.slice(0, 90) || "New objective"}`;
}

async function persistGeneratedWorkflow(args: {
  sb: Sb;
  userId: string;
  orgId: string | null;
  workforceId: string | null;
  goal: string;
  plan: OrchestratorPlan;
}) {
  const { data: workflow, error } = await args.sb
    .from("workflows")
    .insert({
      user_id: args.userId,
      org_id: args.orgId,
      workforce_id: args.workforceId,
      name: generatedWorkflowName(args.goal),
      description: args.plan.summary || "Generated by the PalladiumAI Orchestrator.",
      status: "active",
      trigger_type: "orchestrator",
      trigger_config: {
        generated: true,
        orchestrator_version: 1,
        goal: args.goal.slice(0, 12_000),
        plan: args.plan,
      },
    })
    .select("id,name")
    .maybeSingle();
  if (error || !workflow)
    throw new OrchestratorError(error?.message ?? "Could not create the orchestration workflow.", "WORKFLOW_CREATE_FAILED", 500);

  const stepIds = new Map(args.plan.assignments.map((assignment) => [assignment.id, crypto.randomUUID()]));
  const steps = args.plan.assignments.map((assignment, position) => {
    const dependencies: string[] = assignment.depends_on
      .map((id) => stepIds.get(id))
      .filter((id) => id !== undefined)
      .map((id) => String(id));
    const upstreamTemplate = dependencies.length
      ? `\n\nDeclared upstream evidence:\n${dependencies
          .map((id, index) => `Source ${index + 1}: {{steps.${id}.output}}`)
          .join("\n\n")}`
      : "";
    return {
      id: stepIds.get(assignment.id),
      workflow_id: workflow.id,
      position,
      name: assignment.title,
      kind: "agent",
      agent_id: assignment.agent_id,
      mode: dependencies.length ? "sequential" : "parallel",
      depends_on: dependencies,
      condition: {},
      input_template:
        `Overall goal: {{input}}\n\nYour assigned objective: ${assignment.objective}` +
        `${assignment.success_criteria.length ? `\n\nSuccess criteria:\n- ${assignment.success_criteria.join("\n- ")}` : ""}` +
        upstreamTemplate,
      max_retries: 2,
      retry_delay_ms: 750,
      timeout_ms: 180_000,
      continue_on_error: false,
      requires_approval: assignment.requires_approval,
      config: { orchestrator_assignment_id: assignment.id },
    };
  });
  const { error: stepError } = await args.sb.from("workflow_steps").insert(steps);
  if (stepError)
    throw new OrchestratorError(stepError.message, "WORKFLOW_STEPS_CREATE_FAILED", 500);

  return workflow as { id: string; name: string };
}

/** Select specialists, generate a dependency-aware workflow, then execute it. */
export async function orchestrateGoal(args: {
  sb: Sb;
  userId: string;
  goal: string;
  workforceId?: string | null;
  orgId?: string | null;
}) {
  const goal = String(args.goal ?? "").trim();
  if (!goal) throw new OrchestratorError("Give the Orchestrator a goal.", "EMPTY_GOAL");
  if (goal.length > 12_000) throw new OrchestratorError("Keep the goal under 12,000 characters.", "GOAL_TOO_LONG");

  const eligible = await loadEligibleAgents({
    sb: args.sb,
    userId: args.userId,
    goal,
    ...(args.workforceId !== undefined ? { workforceId: args.workforceId } : {}),
    ...(args.orgId !== undefined ? { orgId: args.orgId } : {}),
  });
  const plan = await createDelegationPlan(goal, eligible.agents);
  const workflow = await persistGeneratedWorkflow({
    sb: args.sb,
    userId: args.userId,
    orgId: eligible.orgId,
    workforceId: eligible.workforceId,
    goal,
    plan,
  });
  const execution = await executeWorkflow({
    sb: args.sb,
    userId: args.userId,
    workflowId: workflow.id,
    input: goal,
    trigger: "orchestrator",
  });
  return { workflow, plan, execution };
}
