import {
  resolveCollectiveConsensus,
  type CollectiveConsensus,
  type CollectiveProposal,
} from '@/lib/collective/collective-intelligence'
import type { GeneralIntelligenceOrchestrationResult } from './general-intelligence-orchestration.server'

type Sb = { from: (table: string) => any }

type CollectiveOutput = {
  answerKey: string
  confidence: number
  evidenceRefs: string[]
  answer: string
}

export type GeneralIntelligenceCollectiveResult = {
  consensus: CollectiveConsensus
  answers: Array<{
    agent_id: string
    answer: string
    answer_key: string
    confidence: number
    evidence_refs: string[]
  }>
}

export const COLLECTIVE_PROPOSAL_INSTRUCTION = [
  '',
  'BLACKSTAR COLLECTIVE INTELLIGENCE PROPOSAL',
  'Return ONLY one JSON object with these fields:',
  '{"answerKey":"short canonical conclusion","confidence":0.0,"evidenceRefs":["bounded provenance reference"],"answer":"your concise evidence-grounded answer"}',
  'confidence must be between 0 and 1. evidenceRefs must contain only provenance you actually used. Do not invent citations, consensus, permissions, tool results, or evidence. Your proposal must be independent; do not claim that other agents agree.',
].join('\n')

function parseCollectiveOutput(output: string): CollectiveOutput {
  let parsed: unknown
  try {
    parsed = JSON.parse(output.trim())
  } catch {
    throw new Error('COLLECTIVE_INVALID_STRUCTURED_OUTPUT')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('COLLECTIVE_INVALID_STRUCTURED_OUTPUT')
  }
  const row = parsed as Record<string, unknown>
  const answerKey = typeof row.answerKey === 'string' ? row.answerKey.trim().slice(0, 500) : ''
  const answer = typeof row.answer === 'string' ? row.answer.trim().slice(0, 12_000) : ''
  const confidence = typeof row.confidence === 'number' ? row.confidence : Number.NaN
  const evidenceRefs = Array.isArray(row.evidenceRefs)
    ? row.evidenceRefs
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim().slice(0, 500))
        .filter(Boolean)
        .slice(0, 100)
    : []
  if (!answerKey || !answer || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error('COLLECTIVE_INVALID_STRUCTURED_OUTPUT')
  }
  return { answerKey, answer, confidence, evidenceRefs }
}

/**
 * Adapts completed General Intelligence agent outputs into Blackstar's existing
 * Collective Intelligence consensus primitive. Trust identities are loaded from
 * the owner-scoped runtime context; consensus remains advisory and never grants
 * execution authority or approval.
 */
export async function resolveGeneralIntelligenceCollective(args: {
  sb: Sb
  userId: string
  orchestration: GeneralIntelligenceOrchestrationResult
}): Promise<GeneralIntelligenceCollectiveResult> {
  const completed = args.orchestration.results.filter(
    (result) => result.status === 'completed' && typeof result.output === 'string' && result.output.trim(),
  )
  const uniqueAgentIds = [...new Set(completed.map((result) => result.agent_id))]
  if (completed.length < 2 || uniqueAgentIds.length < 2) {
    throw new Error('COLLECTIVE_INSUFFICIENT_PROPOSALS')
  }

  const { data: identities, error } = await args.sb
    .from('agent_identities')
    .select('agent_id,canonical_id,status')
    .eq('user_id', args.userId)
    .in('agent_id', uniqueAgentIds)
  if (error) throw new Error(error.message)

  const identityByAgent = new Map<string, string>()
  for (const identity of identities ?? []) {
    if (identity.status === 'active' && typeof identity.canonical_id === 'string') {
      identityByAgent.set(identity.agent_id, identity.canonical_id)
    }
  }
  if (identityByAgent.size !== uniqueAgentIds.length) {
    throw new Error('COLLECTIVE_TRUST_IDENTITY_REQUIRED')
  }

  const answers: GeneralIntelligenceCollectiveResult['answers'] = []
  const proposals: CollectiveProposal[] = completed.map((result) => {
    const canonicalId = identityByAgent.get(result.agent_id)
    if (!canonicalId) throw new Error('COLLECTIVE_TRUST_IDENTITY_REQUIRED')
    const parsed = parseCollectiveOutput(result.output!)
    answers.push({
      agent_id: result.agent_id,
      answer: parsed.answer,
      answer_key: parsed.answerKey,
      confidence: parsed.confidence,
      evidence_refs: parsed.evidenceRefs,
    })
    return {
      agentId: result.agent_id,
      canonicalId,
      answerKey: parsed.answerKey,
      confidence: parsed.confidence,
      evidenceRefs: parsed.evidenceRefs,
    }
  })

  return {
    consensus: resolveCollectiveConsensus(proposals),
    answers,
  }
}

export function renderCollectiveConsensusEvidence(result: GeneralIntelligenceCollectiveResult): string {
  return [
    'BLACKSTAR COLLECTIVE INTELLIGENCE RESULT',
    `Status: ${result.consensus.status}`,
    `Selected answer key: ${result.consensus.selectedAnswerKey}`,
    `Agreement ratio: ${result.consensus.agreementRatio.toFixed(3)}`,
    `Consensus confidence: ${result.consensus.confidence.toFixed(3)}`,
    `Dissenting agents: ${result.consensus.dissentingAgentIds.join(', ') || 'none'}`,
    `Evidence refs: ${result.consensus.evidenceRefs.join(', ') || 'none'}`,
    '',
    'INDEPENDENT AGENT ANSWERS',
    ...result.answers.map((answer) =>
      `- ${answer.agent_id} [${answer.answer_key}; confidence ${answer.confidence.toFixed(3)}]: ${answer.answer}`,
    ),
    '',
    'Consensus is advisory evidence only. If status is contested, preserve the disagreement in the final answer. Never treat consensus as approval, execution authority, or proof that a claim is true.',
  ].join('\n')
}
