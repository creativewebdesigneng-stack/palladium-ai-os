/**
 * The PalladiumAI agent runtime.
 *
 * Execution flow (all steps server-side, nothing trusted from the browser):
 *   auth -> permission -> subscription -> usage -> load agent -> load memory ->
 *   load tools -> build context -> model -> tool calls -> response ->
 *   save memory -> save task -> update usage
 *
 * Runs are never left stuck: stale runs are reaped, every model call is
 * time-boxed and retried, and every failure path closes the task row.
 */
import { writeAudit } from '@/lib/platform/audit.server';
import { assertWithinLimit, getEntitlements, recordUsage } from '@/lib/platform/entitlements.server';
import {
  normaliseProvider,
  ProviderError,
  resolveModel,
  runChat,
  streamChat,
  type ChatMessage,
  type ChatResult,
} from './model-gateway.server';
import { executeTool, resolveGrantedTools, type ToolGrant } from './tools.server';

type Sb = { from: (t: string) => any; rpc?: (fn: string, args?: Record<string, unknown>) => any };

export type Agent = {
  id: string;
  user_id: string;
  org_id: string | null;
  org_id_fk: string | null;
  name: string;
  description: string | null;
  purpose: string | null;
  personality: string | null;
  instructions: string | null;
  system_prompt: string | null;
  model_provider: string | null;
  model: string | null;
  temperature: number | null;
  max_tokens: number | null;
  memory_enabled: boolean | null;
  allowed_tools: string[] | null;
  requires_approval: boolean | null;
  autonomy: string | null;
  status: string | null;
  category: string | null;
};

export class RuntimeError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const MAX_TOOL_ROUNDS = 4;
const RUN_BUDGET_MS = 120_000;

/* --------------------------------------------------------------- preparation */

async function reapStale(userId: string) {
  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    await supabaseAdmin.rpc('reap_stale_agent_tasks', { _user: userId } as never);
  } catch (error) {
    console.error('[runtime] reap failed', error);
  }
}

/** Loads the agent through the caller's own client, so RLS is the permission check. */
async function loadAgent(sb: Sb, agentId: string): Promise<Agent> {
  const { data, error } = await sb.from('personal_agents').select('*').eq('id', agentId).maybeSingle();
  if (error) throw new RuntimeError('Could not load that agent.', 'AGENT_LOAD_FAILED', 500);
  if (!data) throw new RuntimeError('Agent not found or you do not have access to it.', 'AGENT_FORBIDDEN', 403);
  if (data.status === 'archived') throw new RuntimeError('This agent is archived. Restore it before running tasks.', 'AGENT_ARCHIVED', 409);
  return data as Agent;
}

async function buildContext(sb: Sb, agent: Agent, input: string): Promise<ChatMessage[]> {
  const system: string[] = [
    `You are ${agent.name}, an autonomous agent inside PalladiumAI, the operator's AI workforce OS.`,
  ];
  if (agent.description) system.push(`About you: ${agent.description}`);
  if (agent.purpose) system.push(`Your purpose: ${agent.purpose}`);
  if (agent.personality) system.push(`Personality and tone: ${agent.personality}`);
  if (agent.instructions) system.push(`Standing instructions:\n${agent.instructions}`);
  if (agent.system_prompt) system.push(agent.system_prompt);
  system.push(
    'Operating rules: be concise and decisive, use markdown, cite sources when you used the web, and never claim to have completed a real-world action unless a tool confirmed it. If an action costs money or affects the outside world, raise an approval request instead of pretending to act.',
  );

  const messages: ChatMessage[] = [];

  if (agent.memory_enabled !== false) {
    // Memory is injected before execution: short-term context, long-term facts,
    // organisation knowledge and document extracts relevant to this input.
    const [memory, historyRes] = await Promise.all([
      retrieveRelevantMemory({
        sb: sb as never,
        userId: agent.user_id,
        agentId: agent.id,
        orgId: agent.org_id_fk ?? agent.org_id ?? null,
        query: input,
      }).catch((error) => {
        console.error('[runtime] memory retrieval failed', error);
        return null;
      }),
      sb
        .from('agent_tasks')
        .select('input,output_text,status')
        .eq('agent_id', agent.id)
        .eq('status', 'succeeded')
        .order('created_at', { ascending: false })
        .limit(3),
    ]);

    const memoryPrompt = memory ? renderMemoryPrompt(memory) : '';
    if (memoryPrompt) system.push(memoryPrompt);

    for (const past of [...(historyRes.data ?? [])].reverse()) {
      if (!past.input) continue;
      messages.push({ role: 'user', content: String(past.input).slice(0, 1500) });
      messages.push({ role: 'assistant', content: String(past.output_text ?? '').slice(0, 1500) });
    }
  }

  messages.unshift({ role: 'system', content: system.join('\n\n') });
  messages.push({ role: 'user', content: input });
  return messages;
}

export type PreparedRun = {
  agent: Agent;
  orgId: string | null;
  taskId: string;
  messages: ChatMessage[];
  tools: Awaited<ReturnType<typeof resolveGrantedTools>>;
  provider: ReturnType<typeof normaliseProvider>;
  model: string;
  startedAt: number;
};

/**
 * Runs every pre-flight gate and opens the task row. Throws before any model
 * spend if the caller is not entitled to run.
 */
export async function prepareRun(args: {
  sb: Sb;
  userId: string;
  agentId: string;
  input: string;
}): Promise<PreparedRun> {
  const input = args.input?.trim();
  if (!input) throw new RuntimeError('Give the agent something to do.', 'EMPTY_INPUT');
  if (input.length > 12_000) throw new RuntimeError('That task is too long — keep it under 12,000 characters.', 'INPUT_TOO_LONG');

  await reapStale(args.userId);

  const agent = await loadAgent(args.sb, args.agentId);
  const orgId = agent.org_id_fk ?? agent.org_id ?? null;

  // Subscription + monthly execution limit, resolved from the database.
  const ent = await getEntitlements(args.sb as never, args.userId, orgId);
  assertWithinLimit(ent, 'tasks_per_month');

  const tools = await resolveGrantedTools(args.sb, agent);
  const provider = normaliseProvider(agent.model_provider);
  const model = resolveModel(provider, agent.model);
  const messages = await buildContext(args.sb, agent, input);

  const { data: task, error } = await args.sb
    .from('agent_tasks')
    .insert({
      user_id: args.userId,
      org_id: orgId,
      agent_id: agent.id,
      input,
      title: input.slice(0, 120),
      provider,
      model,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select('*')
    .maybeSingle();

  if (error || !task) throw new RuntimeError('Could not queue that run.', 'TASK_CREATE_FAILED', 500);

  await args.sb.from('agent_activities').insert({
    user_id: args.userId,
    org_id: orgId,
    agent_id: agent.id,
    kind: 'run_started',
    message: `${agent.name} started: ${input.slice(0, 120)}`,
    metadata: { task_id: task.id, provider, model },
  });

  return { agent, orgId, taskId: task.id as string, messages, tools, provider, model, startedAt: Date.now() };
}

/* ------------------------------------------------------------ finalise a task */

async function admin() {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  return supabaseAdmin as unknown as Sb;
}

async function isCancelled(sb: Sb, taskId: string) {
  const { data } = await sb.from('agent_tasks').select('status').eq('id', taskId).maybeSingle();
  return data?.status === 'cancelled';
}

export async function completeRun(args: {
  sb: Sb;
  userId: string;
  run: PreparedRun;
  result: ChatResult;
  toolCallCount: number;
}) {
  const { run, result } = args;
  const duration = Date.now() - run.startedAt;
  const db = await admin();

  const output = { text: result.text, tool_calls: args.toolCallCount };
  await db
    .from('agent_tasks')
    .update({
      status: 'succeeded',
      output,
      output_text: result.text,
      tokens_in: result.usage.input,
      tokens_out: result.usage.output,
      duration_ms: duration,
      completed_at: new Date().toISOString(),
    })
    .eq('id', run.taskId);

  await db.from('personal_agents').update({ last_run_at: new Date().toISOString() }).eq('id', run.agent.id);

  // Save memory: a compact trace of what was asked and delivered.
  if (run.agent.memory_enabled !== false && result.text) {
    await args.sb.from('personal_memories').insert({
      user_id: args.userId,
      org_id: run.orgId,
      agent_id: run.agent.id,
      category: 'run_history',
      key: `run:${new Date().toISOString().slice(0, 19)}`,
      value: `Task: ${run.messages[run.messages.length - 1]?.content?.slice(0, 300)}\nOutcome: ${result.text.slice(0, 600)}`,
      scope: 'personal',
      metadata: { task_id: run.taskId, agent: run.agent.name },
    });
  }

  await Promise.all([
    recordUsage({
      userId: args.userId,
      orgId: run.orgId,
      metric: 'agent_task',
      quantity: 1,
      agentId: run.agent.id,
      metadata: {
        task_id: run.taskId,
        provider: run.provider,
        model: run.model,
        tokens_in: result.usage.input,
        tokens_out: result.usage.output,
        duration_ms: duration,
      },
    }),
    recordUsage({
      userId: args.userId,
      orgId: run.orgId,
      metric: 'tokens',
      quantity: result.usage.input + result.usage.output,
      unit: 'token',
      agentId: run.agent.id,
      metadata: { task_id: run.taskId, provider: run.provider, model: run.model },
    }),
    args.sb.from('agent_activities').insert({
      user_id: args.userId,
      org_id: run.orgId,
      agent_id: run.agent.id,
      kind: 'run_completed',
      message: `${run.agent.name} completed a task in ${(duration / 1000).toFixed(1)}s`,
      metadata: { task_id: run.taskId, tokens: result.usage.input + result.usage.output },
    }),
    writeAudit({
      userId: args.userId,
      orgId: run.orgId,
      action: 'agent.run',
      targetType: 'agent_task',
      targetId: run.taskId,
      agentId: run.agent.id,
      metadata: { provider: run.provider, model: run.model, duration_ms: duration },
    }),
  ]);

  const { data } = await args.sb.from('agent_tasks').select('*').eq('id', run.taskId).maybeSingle();
  return data;
}

export async function failRun(args: {
  userId: string;
  run: Pick<PreparedRun, 'taskId' | 'agent' | 'orgId' | 'startedAt'>;
  error: unknown;
}) {
  const message =
    args.error instanceof ProviderError || args.error instanceof RuntimeError
      ? args.error.message
      : 'The run failed unexpectedly. Please try again.';
  const db = await admin();
  await db
    .from('agent_tasks')
    .update({
      status: 'failed',
      error: message.slice(0, 1000),
      duration_ms: Date.now() - args.run.startedAt,
      completed_at: new Date().toISOString(),
    })
    .eq('id', args.run.taskId);

  await db.from('agent_activities').insert({
    user_id: args.userId,
    org_id: args.run.orgId,
    agent_id: args.run.agent.id,
    kind: 'run_failed',
    message: `${args.run.agent.name} failed: ${message.slice(0, 160)}`,
    metadata: { task_id: args.run.taskId },
  });

  await writeAudit({
    userId: args.userId,
    orgId: args.run.orgId,
    action: 'agent.run',
    status: 'failed',
    targetType: 'agent_task',
    targetId: args.run.taskId,
    agentId: args.run.agent.id,
    metadata: { error: message },
  });

  console.error('[runtime] run failed', args.run.taskId, args.error);
  return message;
}

/* ------------------------------------------------------------------- the loop */

type ToolLoopDeps = {
  sb: Sb;
  userId: string;
  run: PreparedRun;
  grants: Map<string, ToolGrant>;
  onEvent?: (event: RunEvent) => void | Promise<void>;
  signal: AbortSignal;
};

export type RunEvent =
  | { type: 'status'; status: string; task_id: string }
  | { type: 'delta'; text: string }
  | { type: 'tool'; name: string; ok: boolean }
  | { type: 'error'; message: string }
  | { type: 'complete'; task: unknown };

async function runToolCalls(deps: ToolLoopDeps, result: ChatResult, messages: ChatMessage[]) {
  messages.push({ role: 'assistant', content: result.text, tool_calls: result.toolCalls });
  for (const call of result.toolCalls) {
    const exec = await executeTool(
      call.name,
      call.arguments,
      {
        userId: deps.userId,
        orgId: deps.run.orgId,
        agentId: deps.run.agent.id,
        taskId: deps.run.taskId,
        sb: deps.sb,
        signal: deps.signal,
      },
      deps.grants,
    );
    await deps.onEvent?.({ type: 'tool', name: call.name, ok: exec.ok });
    messages.push({
      role: 'tool',
      tool_call_id: call.id,
      name: call.name,
      content: JSON.stringify(exec.output).slice(0, 8000),
    });
  }
}

/** Non-streaming execution: model turns + tool rounds until a final answer. */
export async function executeRun(args: { sb: Sb; userId: string; run: PreparedRun }) {
  const controller = new AbortController();
  const budget = setTimeout(() => controller.abort(), RUN_BUDGET_MS);
  const messages = [...args.run.messages];
  let toolCallCount = 0;
  const usage = { input: 0, output: 0 };

  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
      if (await isCancelled(args.sb, args.run.taskId)) {
        throw new RuntimeError('Run cancelled by the operator.', 'CANCELLED', 499);
      }
      const result = await runChat({
        provider: args.run.provider,
        model: args.run.model,
        messages,
        tools: round < MAX_TOOL_ROUNDS ? args.run.tools.defs : [],
        temperature: args.run.agent.temperature,
        maxTokens: args.run.agent.max_tokens,
        signal: controller.signal,
      });
      usage.input += result.usage.input;
      usage.output += result.usage.output;

      if (!result.toolCalls.length) {
        return await completeRun({
          sb: args.sb,
          userId: args.userId,
          run: args.run,
          result: { ...result, usage },
          toolCallCount,
        });
      }
      toolCallCount += result.toolCalls.length;
      await runToolCalls(
        { sb: args.sb, userId: args.userId, run: args.run, grants: args.run.tools.grants, signal: controller.signal },
        result,
        messages,
      );
    }
    throw new RuntimeError('The agent used too many tool rounds without answering.', 'TOOL_LOOP_EXHAUSTED', 500);
  } finally {
    clearTimeout(budget);
  }
}

/** Streaming execution: yields runtime events for a live console. */
export async function* streamRun(args: { sb: Sb; userId: string; run: PreparedRun }): AsyncGenerator<RunEvent> {
  const controller = new AbortController();
  const budget = setTimeout(() => controller.abort(), RUN_BUDGET_MS);
  const messages = [...args.run.messages];
  const pending: RunEvent[] = [];
  const usage = { input: 0, output: 0 };
  let toolCallCount = 0;

  yield { type: 'status', status: 'running', task_id: args.run.taskId };

  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
      if (await isCancelled(args.sb, args.run.taskId)) {
        throw new RuntimeError('Run cancelled by the operator.', 'CANCELLED', 499);
      }

      let final: ChatResult | null = null;
      for await (const event of streamChat({
        provider: args.run.provider,
        model: args.run.model,
        messages,
        tools: round < MAX_TOOL_ROUNDS ? args.run.tools.defs : [],
        temperature: args.run.agent.temperature,
        maxTokens: args.run.agent.max_tokens,
        signal: controller.signal,
      })) {
        if (event.type === 'text') yield { type: 'delta', text: event.delta };
        if (event.type === 'done') final = event.result;
      }
      if (!final) throw new RuntimeError('The model returned no response.', 'EMPTY_RESPONSE', 502);
      usage.input += final.usage.input;
      usage.output += final.usage.output;

      if (!final.toolCalls.length) {
        const task = await completeRun({
          sb: args.sb,
          userId: args.userId,
          run: args.run,
          result: { ...final, usage },
          toolCallCount,
        });
        yield { type: 'complete', task };
        return;
      }

      toolCallCount += final.toolCalls.length;
      await runToolCalls(
        {
          sb: args.sb,
          userId: args.userId,
          run: args.run,
          grants: args.run.tools.grants,
          signal: controller.signal,
          onEvent: (e) => void pending.push(e),
        },
        final,
        messages,
      );
      while (pending.length) yield pending.shift()!;
    }
    throw new RuntimeError('The agent used too many tool rounds without answering.', 'TOOL_LOOP_EXHAUSTED', 500);
  } catch (error) {
    const message = await failRun({ userId: args.userId, run: args.run, error });
    yield { type: 'error', message };
  } finally {
    clearTimeout(budget);
  }
}
