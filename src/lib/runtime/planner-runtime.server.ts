import type { AgentOperatingProfile } from "@/lib/agents/agent-spec";
import {
  applyReplan,
  createInitialPlan,
  normaliseVerificationDecision,
  renderPlannerPrompt,
  shouldComplete,
  shouldReplan,
  updatePlanAfterObservation,
  type AgentPlan,
  type VerificationDecision,
} from "@/lib/agents/agent-planner";
import { notify } from "@/lib/notifications/notify.server";
import {
  completeRun,
  RuntimeError,
  setRunState,
  type PreparedRun,
} from "./runtime.server";
import { runChat, type ChatMessage, type ChatResult } from "./model-gateway.server";
import { executeTool } from "./tools.server";
import {
  canBatchInParallel,
  compactToolResultForModel,
  RunLoopGuard,
} from "./atomic-loop-guard.server";
import { applyRunSteering, createSteeringCursor } from "./run-steering.server";

type Sb = { from: (t: string) => any };

type PlannerAgent = PreparedRun["agent"] & {
  operating_profile?: AgentOperatingProfile | null;
  spec_version?: number | null;
};

const MAX_TOTAL_MODEL_ROUNDS = 10;
const MAX_TOOL_ROUNDS = 4;
const MAX_RUNTIME_MS = 120_000;

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

function verifierInstruction(plan: AgentPlan, candidate: string) {
  return [
    "You are the PalladiumAI verification controller. Judge only the evidence and candidate answer; do not execute tools.",
    `Objective: ${plan.objective}`,
    `Required quality threshold: ${plan.quality_threshold}`,
    "Plan:",
    renderPlannerPrompt(plan),
    "Candidate answer:",
    candidate.slice(0, 12_000),
    "Return one JSON object only with this shape:",
    '{"passed":true,"score":0.9,"issues":[],"evidence":["..."],"next_action":"complete","revised_steps":[]}',
    "Set passed=false when completion claims are unsupported, required outputs are missing, tool evidence contradicts the answer, or success criteria are not met. Use next_action=replan when another bounded attempt can fix the issues; use escalate when operator input or approval is required.",
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

async function persistVerification(sb: Sb, taskId: string, decision: VerificationDecision) {
  const { error } = await sb
    .from("agent_tasks")
    .update({ verification_state: decision, heartbeat_at: new Date().toISOString() })
    .eq("id", taskId);
  if (error) console.error("[planner] could not persist verification state", error);
}

async function heartbeat(sb: Sb, taskId: string) {
  await sb
    .from("agent_tasks")
    .update({ heartbeat_at: new Date().toISOString() })
    .eq("id", taskId);
}

async function cancelled(sb: Sb, taskId: string) {
  const { data } = await sb
    .from("agent_tasks")
    .select("status,cancel_requested")
    .eq("id", taskId)
    .maybeSingle();
  return data?.status === "cancelled" || data?.cancel_requested === true;
}

async function verifyCandidate(run: PreparedRun, plan: AgentPlan, candidate: string, signal: AbortSignal) {
  if (!plan.verification_required) {
    return normaliseVerificationDecision({ passed: true, score: 1, next_action: "complete" });
  }
  try {
    const result = await runChat({
      provider: run.provider,
      model: run.model,
      messages: [
        run.messages[0] ?? { role: "system", content: "" },
        { role: "user", content: verifierInstruction(plan, candidate) },
      ],
      tools: [],
      temperature: 0,
      maxTokens: 1400,
      signal,
    });
    const parsed = extractJsonObject(result.text);
    return normaliseVerificationDecision(parsed ?? { passed: false, score: 0, issues: ["Verifier returned invalid structured output"], next_action: "replan" });
  } catch (error) {
    if (signal.aborted) throw error;
    console.error("[planner] verification pass failed", error);
    return normaliseVerificationDecision({
      passed: false,
      score: 0,
      issues: ["Verification could not be completed"],
      next_action: "replan",
    });
  }
}

type PlannedToolOutcome = {
  ok: boolean;
  output: unknown;
  notice?: string;
};

async function invokePlannedTool(args: {
  sb: Sb;
  userId: string;
  run: PreparedRun;
  signal: AbortSignal;
  guard: RunLoopGuard;
  call: { name: string; arguments: Record<string, unknown> };
}): Promise<PlannedToolOutcome> {
  const decision = args.guard.inspect(args.call);
  if (decision.action === "veto") {
    args.guard.record(args.call, decision.output);
    return { ok: false, output: decision.output };
  }

  const exec = await executeTool(
    args.call.name,
    args.call.arguments,
    {
      userId: args.userId,
      orgId: args.run.orgId,
      agentId: args.run.agent.id,
      taskId: args.run.taskId,
      sb: args.sb,
      signal: args.signal,
      allowedProviders: args.run.agent.allowed_providers ?? [],
    },
    args.run.tools.grants,
  );
  args.guard.record(args.call, exec.output);
  return {
    ok: exec.ok,
    output: exec.output,
    ...(decision.action === "warn" ? { notice: decision.notice } : {}),
  };
}

async function runToolCalls(args: {
  sb: Sb;
  userId: string;
  run: PreparedRun;
  result: ChatResult;
  messages: ChatMessage[];
  plan: AgentPlan;
  signal: AbortSignal;
  guard: RunLoopGuard;
}) {
  args.messages.push({ role: "assistant", content: args.result.text, tool_calls: args.result.toolCalls });
  await setRunState(args.sb, args.run.taskId, "waiting_for_tool");
  let awaitingApproval = false;
  let plan = args.plan;
  try {
    const parallel = canBatchInParallel(args.result.toolCalls, args.run.tools.grants);
    const outcomes: PlannedToolOutcome[] = parallel
      ? await Promise.all(
          args.result.toolCalls.map((call) =>
            invokePlannedTool({
              sb: args.sb,
              userId: args.userId,
              run: args.run,
              signal: args.signal,
              guard: args.guard,
              call,
            }),
          ),
        )
      : [];

    for (let index = 0; index < args.result.toolCalls.length; index += 1) {
      const call = args.result.toolCalls[index]!;
      const outcome = parallel
        ? outcomes[index]!
        : await invokePlannedTool({
            sb: args.sb,
            userId: args.userId,
            run: args.run,
            signal: args.signal,
            guard: args.guard,
            call,
          });
      const output = outcome.output as Record<string, unknown> | null;
      awaitingApproval = awaitingApproval || Boolean(
        output &&
          (output["approval_request_id"] || output["status"] === "awaiting_approval" || output["requires_approval"] === true),
      );
      const content = compactToolResultForModel(outcome.output);
      args.messages.push({
        role: "tool",
        tool_call_id: call.id,
        name: call.name,
        content: outcome.notice ? RunLoopGuard.withNotice(content, outcome.notice) : content,
      });
      if (plan.current_step_id) {
        plan = updatePlanAfterObservation(plan, {
          stepId: plan.current_step_id,
          evidence: [`${call.name}: ${compactToolResultForModel(outcome.output, 1_000)}`],
        });
      }
    }
    await persistPlan(args.sb, args.run.taskId, plan);
  } finally {
    await setRunState(args.sb, args.run.taskId, awaitingApproval ? "waiting_for_approval" : "running");
  }
  if (awaitingApproval) {
    await notify({
      userId: args.userId,
      orgId: args.run.orgId,
      type: "agent.input_required",
      title: `${args.run.agent.name} is waiting for you`,
      body: "The run paused on an action that needs your approval before it can continue.",
      link: "/mission-control",
      metadata: { task_id: args.run.taskId, agent_id: args.run.agent.id },
    });
  }
  return { plan, awaitingApproval };
}

/**
 * Planner + executor + observer + verifier + bounded re-planner for direct
 * agent runs. Completion is committed only after the verifier passes the
 * Agent Spec quality threshold (unless verification is explicitly disabled).
 */
export async function executePlannedRun(args: {
  sb: Sb;
  userId: string;
  run: PreparedRun;
  signal?: AbortSignal;
  timeoutMs?: number;
}) {
  const controller = new AbortController();
  let ownerAbort: RuntimeError | null = null;
  const abortFromOwner = () => {
    ownerAbort = new RuntimeError("Run cancelled by the operator.", "CANCELLED", 499);
    controller.abort();
  };
  if (args.signal?.aborted) abortFromOwner();
  else args.signal?.addEventListener("abort", abortFromOwner, { once: true });

  let timedOut = false;
  const budget = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, Math.min(Math.max(args.timeoutMs ?? MAX_RUNTIME_MS, 1_000), MAX_RUNTIME_MS));

  let plan = await buildPlan(args.run);
  await persistPlan(args.sb, args.run.taskId, plan);
  const messages: ChatMessage[] = [
    args.run.messages[0] ?? { role: "system", content: "" },
    { role: "system", content: renderPlannerPrompt(plan) },
    ...args.run.messages.slice(1),
  ];
  const usage = { input: 0, output: 0 };
  let toolCallCount = 0;
  let toolRounds = 0;
  const guard = new RunLoopGuard();
  const steeringCursor = createSteeringCursor();

  try {
    for (let round = 0; round < MAX_TOTAL_MODEL_ROUNDS; round += 1) {
      if (ownerAbort) throw ownerAbort;
      if (timedOut) throw new RuntimeError("The run exceeded its time budget.", "RUN_TIMEOUT", 504);
      if (await cancelled(args.sb, args.run.taskId)) {
        throw new RuntimeError("Run cancelled by the operator.", "CANCELLED", 499);
      }
      await applyRunSteering({
        sb: args.sb,
        taskId: args.run.taskId,
        cursor: steeringCursor,
        messages,
      });
      await heartbeat(args.sb, args.run.taskId);

      const result = await runChat({
        provider: args.run.provider,
        model: args.run.model,
        messages,
        tools: toolRounds < MAX_TOOL_ROUNDS ? args.run.tools.defs : [],
        temperature: args.run.agent.temperature,
        maxTokens: args.run.agent.max_tokens,
        signal: controller.signal,
      });
      usage.input += result.usage.input;
      usage.output += result.usage.output;

      if (result.toolCalls.length) {
        toolRounds += 1;
        toolCallCount += result.toolCalls.length;
        if (toolRounds > MAX_TOOL_ROUNDS) {
          throw new RuntimeError("The agent used too many tool rounds without producing a verifiable answer.", "TOOL_LOOP_EXHAUSTED", 500);
        }
        const observed = await runToolCalls({
          sb: args.sb,
          userId: args.userId,
          run: args.run,
          result,
          messages,
          plan,
          signal: controller.signal,
          guard,
        });
        plan = observed.plan;
        continue;
      }

      const decision = await verifyCandidate(args.run, plan, result.text, controller.signal);
      await persistVerification(args.sb, args.run.taskId, decision);

      if (shouldComplete(plan, decision)) {
        if (plan.current_step_id) {
          plan = updatePlanAfterObservation(plan, {
            stepId: plan.current_step_id,
            completed: true,
            evidence: decision.evidence,
          });
          await persistPlan(args.sb, args.run.taskId, plan);
        }
        return await completeRun({
          sb: args.sb,
          userId: args.userId,
          run: { ...args.run, messages },
          result: { ...result, usage },
          toolCallCount,
        });
      }

      if (decision.next_action === "escalate") {
        throw new RuntimeError(
          `Verification requires operator input: ${decision.issues.join("; ").slice(0, 700) || "manual review required"}`,
          "VERIFICATION_ESCALATION",
          409,
        );
      }

      if (!shouldReplan(plan, decision)) {
        throw new RuntimeError(
          `The agent could not meet its verification threshold after ${plan.replan_count} re-plan(s): ${decision.issues.join("; ").slice(0, 700) || "verification failed"}`,
          "VERIFICATION_FAILED",
          422,
        );
      }

      plan = applyReplan(plan, decision);
      await persistPlan(args.sb, args.run.taskId, plan);
      messages.push({ role: "assistant", content: result.text });
      messages.push({
        role: "system",
        content: [
          "VERIFIER FEEDBACK — RE-PLAN REQUIRED",
          `Score: ${decision.score}`,
          decision.issues.length ? `Issues: ${decision.issues.join(" | ")}` : "Issues: verification threshold not met",
          renderPlannerPrompt(plan),
          "Continue execution from the revised plan. Use additional tools only when needed to resolve the verifier issues.",
        ].join("\n"),
      });
    }

    throw new RuntimeError(
      "The planner exhausted its bounded model-round budget without reaching verified completion.",
      "PLANNER_LOOP_EXHAUSTED",
      500,
    );
  } catch (error) {
    if (ownerAbort) throw ownerAbort;
    if (timedOut) throw new RuntimeError("The run exceeded its time budget.", "RUN_TIMEOUT", 504);
    throw error;
  } finally {
    clearTimeout(budget);
    args.signal?.removeEventListener("abort", abortFromOwner);
  }
}
