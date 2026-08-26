/**
 * Mid-run operator steering for PalladiumAI agents.
 *
 * Pattern adapted from Atomic Agent's operator steering model: steering is
 * accepted while a run is active, then consumed only at safe runtime
 * checkpoints between model/tool rounds. It never interrupts an in-flight tool
 * and never grants or bypasses approval.
 */
import type { ChatMessage } from "./model-gateway.server";

export const STEERING_KIND = "operator_steering";
export const MAX_STEERING_LENGTH = 4_000;
export const STEERABLE_TASK_STATES = ["queued", "running", "waiting_for_tool"] as const;

type Sb = { from: (table: string) => any };

export type SteeringCursor = {
  seenIds: Set<string>;
};

export type SteeringEvent = {
  id: string;
  message: string;
  created_at?: string | null;
};

export function createSteeringCursor(): SteeringCursor {
  return { seenIds: new Set<string>() };
}

export function sanitiseSteeringMessage(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, MAX_STEERING_LENGTH) : "";
}

/**
 * Queue an owner-scoped steering event. The caller-supplied Supabase client is
 * authenticated as the operator, so task lookup and activity insert both remain
 * protected by existing RLS.
 */
export async function queueRunSteering(args: {
  sb: Sb;
  userId: string;
  taskId: string;
  message: string;
}) {
  const message = sanitiseSteeringMessage(args.message);
  if (!message) throw new Error("Give the agent a steering instruction.");

  const { data: task, error: taskError } = await args.sb
    .from("agent_tasks")
    .select("id,agent_id,org_id,status")
    .eq("id", args.taskId)
    .maybeSingle();
  if (taskError || !task) throw new Error("Run not found or you do not have access to it.");
  if (!(STEERABLE_TASK_STATES as readonly string[]).includes(String(task.status))) {
    throw new Error("That run is no longer accepting steering instructions.");
  }

  const { data, error } = await args.sb
    .from("agent_activities")
    .insert({
      user_id: args.userId,
      org_id: task.org_id ?? null,
      agent_id: task.agent_id ?? null,
      task_id: task.id,
      kind: STEERING_KIND,
      message,
      metadata: { task_id: task.id, source: "operator", consumed_at: null },
    })
    .select("id,task_id,kind,message,created_at")
    .maybeSingle();
  if (error || !data) throw new Error("Could not steer that run.");
  return data;
}

/**
 * Read steering events that this in-memory run has not seen yet. Rows are never
 * mutated, preserving the activity stream as an audit trail. The per-run cursor
 * guarantees each event is injected once during this execution.
 */
export async function consumeRunSteering(args: {
  sb: Sb;
  taskId: string;
  cursor: SteeringCursor;
  limit?: number;
}): Promise<SteeringEvent[]> {
  const limit = Math.min(Math.max(args.limit ?? 8, 1), 20);
  const { data, error } = await args.sb
    .from("agent_activities")
    .select("id,message,created_at")
    .eq("task_id", args.taskId)
    .eq("kind", STEERING_KIND)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[runtime] steering lookup failed", error);
    return [];
  }

  const fresh = (data ?? [])
    .filter((row: any) => row?.id && !args.cursor.seenIds.has(String(row.id)))
    .map((row: any) => ({
      id: String(row.id),
      message: sanitiseSteeringMessage(row.message),
      created_at: row.created_at ?? null,
    }))
    .filter((row: SteeringEvent) => Boolean(row.message));

  for (const row of fresh) args.cursor.seenIds.add(row.id);
  return fresh;
}

/** Injects fresh steering as an explicit operator message before the next model turn. */
export async function applyRunSteering(args: {
  sb: Sb;
  taskId: string;
  cursor: SteeringCursor;
  messages: ChatMessage[];
}): Promise<number> {
  const steering = await consumeRunSteering(args);
  if (!steering.length) return 0;
  const content = steering
    .map((event, index) => `${index + 1}. ${event.message}`)
    .join("\n");
  args.messages.push({
    role: "user",
    content:
      `OPERATOR STEERING (new instructions for this active run):\n${content}\n\n` +
      "Follow these instructions from the next safe step onward. Do not claim they undo an action that already completed, and do not bypass any approval requirement.",
  });
  return steering.length;
}
