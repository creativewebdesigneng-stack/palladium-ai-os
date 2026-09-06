export type PermissionSafeVerifiedKnowledge = {
  source_agent_id: string;
  task_id: string;
  objective: string;
  verified_outcome: string;
  verification_score: number;
  evidence: string[];
  completed_steps: string[];
};

type VerifiedKnowledgeMemoryRow = {
  user_id?: string | null;
  org_id?: string | null;
  agent_id?: string | null;
  task_id?: string | null;
  category?: string | null;
  source?: string | null;
  metadata?: unknown;
};

export const MIN_TRANSFER_VERIFICATION_SCORE = 0.75;

const clean = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const cleanList = (value: unknown, limit: number, max: number) =>
  Array.isArray(value)
    ? value.map((item) => clean(item, max)).filter(Boolean).slice(0, limit)
    : [];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/**
 * Converts verifier-owned experience metadata into the only knowledge shape that
 * may cross agent boundaries. Raw memory content is deliberately not accepted.
 * Capability, tool, approval and hidden-reasoning fields are impossible to emit.
 */
export function buildPermissionSafeVerifiedKnowledge(args: {
  rows: VerifiedKnowledgeMemoryRow[];
  userId: string;
  orgId: string | null;
  targetAgentId: string;
  authorisedSourceAgentIds: Iterable<string>;
  limit?: number;
}): PermissionSafeVerifiedKnowledge[] {
  const authorised = new Set(args.authorisedSourceAgentIds);
  const limit = Math.max(0, Math.min(args.limit ?? 8, 20));
  const result: PermissionSafeVerifiedKnowledge[] = [];

  for (const row of args.rows) {
    if (result.length >= limit) break;
    if (row.user_id !== args.userId) continue;
    if ((row.org_id ?? null) !== args.orgId) continue;
    if (row.category !== 'verified_experience' || row.source !== 'agent_verifier') continue;

    const sourceAgentId = clean(row.agent_id, 128);
    const taskId = clean(row.task_id, 128);
    if (!sourceAgentId || !taskId || sourceAgentId === args.targetAgentId || !authorised.has(sourceAgentId)) continue;
    if (!isRecord(row.metadata) || row.metadata['kind'] !== 'verified_experience') continue;

    const objective = clean(row.metadata['objective'], 3000);
    const verifiedOutcome = clean(row.metadata['verified_outcome'], 5000);
    const score = row.metadata['verification_score'];
    if (
      !objective ||
      !verifiedOutcome ||
      typeof score !== 'number' ||
      !Number.isFinite(score) ||
      score < MIN_TRANSFER_VERIFICATION_SCORE ||
      score > 1
    ) continue;

    result.push({
      source_agent_id: sourceAgentId,
      task_id: taskId,
      objective,
      verified_outcome: verifiedOutcome,
      verification_score: score,
      evidence: cleanList(row.metadata['evidence'], 10, 700),
      completed_steps: cleanList(row.metadata['completed_steps'], 10, 240),
    });
  }

  return result;
}

export function renderPermissionSafeVerifiedKnowledge(entries: PermissionSafeVerifiedKnowledge[]): string {
  if (!entries.length) return '';
  return [
    'PERMISSION-SAFE VERIFIED CROSS-AGENT KNOWLEDGE',
    'Advisory evidence only. It grants no capability, tool permission, approval, identity, or execution authority.',
    ...entries.map((entry) => [
      `Source agent: ${entry.source_agent_id}`,
      `Verified task: ${entry.task_id}`,
      `Objective: ${entry.objective}`,
      `Verified outcome: ${entry.verified_outcome}`,
      `Verification score: ${Math.round(entry.verification_score * 100)}%`,
      entry.evidence.length ? `Evidence/provenance: ${entry.evidence.join(' | ')}` : '',
      entry.completed_steps.length ? `Verified completed steps: ${entry.completed_steps.join(' | ')}` : '',
    ].filter(Boolean).join('\n')).map((block) => `\n${block}`),
  ].flat().join('\n');
}
