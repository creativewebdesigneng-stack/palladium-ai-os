/**
 * Personal task execution — real model work only.
 *
 * Mission Control personal tasks used to be marked "completed" with a canned
 * summary string, and approved tasks were parked in "running" forever. This
 * module performs the actual work through the live model gateway. When no
 * provider is configured, or a provider fails, the task is marked failed with
 * an explicit reason — never a fabricated result.
 */
import {
  normaliseProvider,
  ProviderError,
  resolveModel,
  runChat,
  type ChatMessage,
} from "@/lib/runtime/model-gateway.server";

type Sb = { from: (table: string) => any };

export type PersonalTaskRow = {
  id: string;
  title?: string | null;
  request: string;
  category?: string | null;
  required_tools?: string[] | null;
  agent_id?: string | null;
};

export type PersonalAgentRow = {
  id?: string;
  name?: string | null;
  category?: string | null;
  personality?: string | null;
  purpose?: string | null;
  instructions?: string | null;
  system_prompt?: string | null;
  model_provider?: string | null;
  model?: string | null;
  temperature?: number | null;
  max_tokens?: number | null;
} | null;

export type PersonalTaskExecutionResult =
  | {
      status: "completed";
      summary: string;
      provider: string;
      model: string;
      usage: { input: number; output: number };
    }
  | { status: "failed"; error: string };

function systemPrompt(task: PersonalTaskRow, agent: PersonalAgentRow): string {
  const lines = [
    `You are ${agent?.name ?? "a PalladiumAI personal agent"}, working inside PalladiumAI Mission Control.`,
    "Carry out the operator's request as far as you can with reasoning and writing alone.",
    "You have no tools in this turn: never claim to have browsed, bought, booked, sent or changed anything.",
    "If the request needs a real-world action, say exactly what you prepared and what still needs approval.",
    "Answer in concise markdown. Never invent prices, metrics or record counts.",
  ];
  if (agent?.purpose) lines.push(`Agent purpose: ${agent.purpose}`);
  if (agent?.personality) lines.push(`Tone: ${agent.personality}`);
  if (agent?.instructions) lines.push(`Operator instructions: ${agent.instructions}`);
  if (agent?.system_prompt) lines.push(agent.system_prompt);
  if (task.category) lines.push(`Task category: ${task.category}`);
  if (task.required_tools?.length)
    lines.push(`Capabilities the router flagged: ${task.required_tools.join(", ")}`);
  return lines.join("\n");
}

/**
 * Runs one real model turn for a personal task and writes the outcome onto the
 * task row. Never throws for provider problems — the task row carries the
 * failure so the operator sees a clear state.
 */
export async function executePersonalTask(args: {
  sb: Sb;
  userId: string;
  task: PersonalTaskRow;
  agent?: PersonalAgentRow;
}): Promise<PersonalTaskExecutionResult> {
  const { sb, userId, task } = args;
  const agent = args.agent ?? null;
  const provider = normaliseProvider(agent?.model_provider ?? null);
  const model = resolveModel(provider, agent?.model ?? null);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt(task, agent) },
    { role: "user", content: String(task.request ?? "").slice(0, 8000) },
  ];

  await sb.from("personal_tasks").update({ status: "running" }).eq("id", task.id).eq("user_id", userId);

  try {
    const result = await runChat({
      provider,
      model,
      messages,
      temperature: agent?.temperature ?? null,
      maxTokens: agent?.max_tokens ?? 1200,
    });
    const summary = result.text.trim();
    if (!summary) throw new ProviderError("The model returned an empty response.", 502, true);

    await sb
      .from("personal_tasks")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        result: {
          summary,
          provider: result.provider,
          model: result.model,
          input_tokens: result.usage.input,
          output_tokens: result.usage.output,
          tools: task.required_tools ?? [],
        },
      })
      .eq("id", task.id)
      .eq("user_id", userId);

    return {
      status: "completed",
      summary,
      provider: result.provider,
      model: result.model,
      usage: result.usage,
    };
  } catch (error) {
    const configIssue = error instanceof ProviderError && error.status === 503;
    const message = configIssue
      ? "AI provider is not configured."
      : "AI service temporarily unavailable.";
    console.error("[mission] personal task execution failed", task.id, error);
    await sb
      .from("personal_tasks")
      .update({ status: "failed", result: { error: message } })
      .eq("id", task.id)
      .eq("user_id", userId);
    return { status: "failed", error: message };
  }
}
