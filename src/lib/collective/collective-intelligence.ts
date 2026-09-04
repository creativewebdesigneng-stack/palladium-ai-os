export type CollectiveProposal = {
  agentId: string;
  canonicalId: string;
  answerKey: string;
  confidence: number;
  evidenceRefs: string[];
};

export type CollectiveConsensus = {
  status: "consensus" | "contested";
  selectedAnswerKey: string;
  confidence: number;
  agreementRatio: number;
  participatingAgents: number;
  dissentingAgentIds: string[];
  evidenceRefs: string[];
  ranking: Array<{ answerKey: string; score: number; votes: number }>;
};

function validConfidence(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

/**
 * Deterministically synthesise independent specialist proposals.
 * This function never executes tools or treats consensus as authorisation.
 */
export function resolveCollectiveConsensus(proposals: CollectiveProposal[]): CollectiveConsensus {
  if (proposals.length < 2) throw new Error("COLLECTIVE_INSUFFICIENT_PROPOSALS");

  const agents = new Set<string>();
  const canonicalIds = new Set<string>();
  const buckets = new Map<string, { score: number; votes: number; evidence: Set<string>; agents: string[] }>();

  for (const proposal of proposals) {
    const agentId = proposal.agentId.trim();
    const canonicalId = proposal.canonicalId.trim();
    const answerKey = proposal.answerKey.trim();
    if (!agentId || !canonicalId || !answerKey || !validConfidence(proposal.confidence)) {
      throw new Error("COLLECTIVE_INVALID_PROPOSAL");
    }
    if (agents.has(agentId) || canonicalIds.has(canonicalId)) throw new Error("COLLECTIVE_DUPLICATE_AGENT");
    agents.add(agentId);
    canonicalIds.add(canonicalId);

    const bucket = buckets.get(answerKey) ?? { score: 0, votes: 0, evidence: new Set<string>(), agents: [] };
    bucket.score += proposal.confidence;
    bucket.votes += 1;
    bucket.agents.push(agentId);
    for (const ref of proposal.evidenceRefs) {
      const clean = ref.trim();
      if (clean) bucket.evidence.add(clean);
    }
    buckets.set(answerKey, bucket);
  }

  const ranking = [...buckets.entries()]
    .map(([answerKey, value]) => ({ answerKey, score: value.score, votes: value.votes }))
    .sort((a, b) => b.score - a.score || b.votes - a.votes || a.answerKey.localeCompare(b.answerKey));

  const winner = ranking[0];
  if (!winner) throw new Error("COLLECTIVE_INSUFFICIENT_PROPOSALS");
  const winningBucket = buckets.get(winner.answerKey)!;
  const agreementRatio = winningBucket.votes / proposals.length;
  const confidence = winningBucket.score / winningBucket.votes;
  const dissentingAgentIds = proposals
    .filter((proposal) => proposal.answerKey.trim() !== winner.answerKey)
    .map((proposal) => proposal.agentId.trim())
    .sort();

  return {
    status: agreementRatio > 0.5 ? "consensus" : "contested",
    selectedAnswerKey: winner.answerKey,
    confidence,
    agreementRatio,
    participatingAgents: proposals.length,
    dissentingAgentIds,
    evidenceRefs: [...winningBucket.evidence].sort(),
    ranking,
  };
}
