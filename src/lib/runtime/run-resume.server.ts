import { parseDurableRunCheckpoint, type DurableRunCheckpoint } from "./run-checkpoint.server";

type Sb = {
  rpc?: (fn: string, args?: Record<string, unknown>) => Promise<{ data?: unknown; error?: unknown }>;
};

export type ClaimedRunResume = {
  taskId: string;
  userId: string;
  agentId: string;
  orgId: string | null;
  provider: string | null;
  model: string | null;
  leaseToken: string;
  resumeCount: number;
  checkpoint: DurableRunCheckpoint;
};

function rowOf(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return rowOf(value[0]);
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function parseClaimedRunResume(value: unknown): ClaimedRunResume | null {
  const row = rowOf(value);
  if (!row) return null;
  const checkpoint = parseDurableRunCheckpoint(row["checkpoint_state"]);
  const taskId = nonEmptyString(row["id"]);
  const userId = nonEmptyString(row["user_id"]);
  const agentId = nonEmptyString(row["agent_id"]);
  const leaseToken = nonEmptyString(row["resume_lease_token"]);
  if (!checkpoint || !taskId || !userId || !agentId || !leaseToken) return null;
  const rawResumeCount = Number(row["resume_count"] ?? 0);
  const resumeCount = Number.isFinite(rawResumeCount)
    ? Math.max(0, Math.min(3, Math.floor(rawResumeCount)))
    : 0;
  return {
    taskId,
    userId,
    agentId,
    orgId: nonEmptyString(row["org_id"]),
    provider: nonEmptyString(row["provider"]),
    model: nonEmptyString(row["model"]),
    leaseToken,
    resumeCount,
    checkpoint,
  };
}

/**
 * Claims at most one stale run through the service-role-only database RPC.
 * The SQL side owns row locking/lease issuance; this helper only validates
 * the returned checkpoint before any worker is allowed to resume it.
 */
export async function claimResumableRun(args: {
  sb: Sb;
  staleBefore: Date;
  leaseSeconds?: number;
}): Promise<ClaimedRunResume | null> {
  if (!args.sb.rpc) throw new Error("Supabase RPC is required for durable run resume.");
  const leaseSeconds = Math.max(30, Math.min(600, Math.floor(args.leaseSeconds ?? 120)));
  const { data, error } = await args.sb.rpc("claim_resumable_agent_task", {
    _stale_before: args.staleBefore.toISOString(),
    _lease_seconds: leaseSeconds,
  });
  if (error) throw error;
  return parseClaimedRunResume(data);
}

export async function releaseRunResumeLease(args: {
  sb: Sb;
  taskId: string;
  leaseToken: string;
  error?: string | null;
}): Promise<boolean> {
  if (!args.sb.rpc) throw new Error("Supabase RPC is required for durable run resume.");
  const { data, error } = await args.sb.rpc("release_agent_task_resume_lease", {
    _task_id: args.taskId,
    _lease_token: args.leaseToken,
    _error: args.error?.slice(0, 1000) ?? null,
  });
  if (error) throw error;
  return data === true;
}
