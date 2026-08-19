import type { AgentOperatingProfile } from "@/lib/agents/agent-spec";
import { createInitialPlan, renderPlannerPrompt, type AgentPlan } from "@/lib/agents/agent-planner";
import { executeRun as executeBaseRun, type PreparedRun } from "./runtime.server";
import { runChat, type ChatMessage } from "./model-gateway.server";

type Sb = { from: (t: string) => any };

type PlannerAgent = PreparedRun["agent"] & {
  operating_profile?: AgentOperatingProfile | null;
  spec_version?: number | null;
};

function taskObjective(run: PreparedRun): string {
  const user = [...run.messages].reverse().find((message) => message.role === "user");
  return String(user?.content ?? "").trim().slice(0, 12_000);
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced || trimmed;
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
}

function plannerInstruction(objective: string, profile: AgentOperatingProfile | null | undefined) {
  return [
    "You are the PalladiumAI planning controller. Plan only; do not execute tools or claim work is complete.",
    `Objective: ${objective}`,
    profile?.success_criteria?.length
      ? `Success criteria: ${profile.success_criteria.join(" | ")}`
      : "Success criteria: infer the minimum concrete checks required by the objective.",
    "Return one JSON object only with this shape:",
    '{"assumptions":["..."],"steps":[{"id":"step-1","title":"...","objective":"...","success_criteria":["..."]}]}',
    "Use 1-10 ordered steps. Each step must describe an outcome, not vague thinking. Do not include hidden chain-of-thought or reasoning prose.",
  ].join("\n");
}

async function buildPlan(run: PreparedRun): Promise<AgentPlan> {
  const agent = run.agent as PlannerAgent;
  const profile = agent.operating_profile ?? null;
  const objective = taskObjective(run);
  const fallback = createInitialPlan({ objective, profile });
  if (!objective) return fallback;

  const plannerMessages: ChatMessage[] = [
    ...run.messages.filter((message) => message.role === "system").slice(0, 1),
    { role: "user", content: plannerInstruction(objective, profile) },
  ];

  try {
    const result = await runChat({
      provider: run.provider,
      model: run.model,
      messages: plannerMessages,
      tools: [],
      temperature: 0.1,
      maxTokens: Math.min(Math.max(run.agent.max_tokens ?? 1200, 500), 1800),
    });
    const parsed = extractJsonObject(result.text);
    if (!parsed) return fallback;
    return createInitialPlan({
      objective,
      profile,
      assumptions: parsed["assumptions"],
      proposedSteps: parsed["steps"],
    });
  } catch (error) {
    console.error("[planner] planning pass failed; using deterministic fallback", error);
    return fallback;
  }
}

async function persistPlan(sb: Sb, taskId: string, plan: AgentPlan) {
  const { error } = await sb
    .from("agent_tasks")
    .update({ planner_state: plan, replan_count: plan.replan_count, heartbeat_at: new Date().toISOString() })
    .eq("id", taskId);
  if (error) console.error("[planner] could not persist planner state", error);
}

/**
 * Planner-aware single-agent runtime entry point.
 *
 * Phase 2A deliberately leaves the existing execution/tool/approval engine
 * intact. It adds a bounded, durable planning pass before execution. The next
 * planner batch moves verification and re-plan decisions inside the completion
 * boundary so a run cannot be marked successful before its verifier passes.
 */
export async function executePlannedRun(args: {
  sb: Sb;
  userId: string;
  run: PreparedRun;
  signal?: AbortSignal;
  timeoutMs?: number;
}) {
  const plan = await buildPlan(args.run);
  await persistPlan(args.sb, args.run.taskId, plan);

  const plannedRun: PreparedRun = {
    ...args.run,
    messages: [
      args.run.messages[0] ?? { role: "system", content: "" },
      { role: "system", content: renderPlannerPrompt(plan) },
      ...args.run.messages.slice(1),
    ],
  };

  return await executeBaseRun({
    sb: args.sb,
    userId: args.userId,
    run: plannedRun,
    ...(args.signal ? { signal: args.signal } : {}),
    ...(args.timeoutMs !== undefined ? { timeoutMs: args.timeoutMs } : {}),
  });
}
