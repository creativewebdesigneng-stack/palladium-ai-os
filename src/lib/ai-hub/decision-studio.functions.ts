import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import {
  buildBlackstarOptimizationPlan,
  type BlackstarOptimizationCandidate,
  type BlackstarOptimizationMetric,
  type BlackstarOptimizationPolicy,
} from './optimization'
import {
  rankCounterfactuals,
  selectCounterfactual,
  type CounterfactualPolicy,
  type CounterfactualScenario,
} from './counterfactual'

const risk = z.enum(['low', 'medium', 'high'])
const direction = z.enum(['increase', 'decrease'])

const optimizationMetricSchema = z.object({
  id: z.string().trim().min(1).max(120),
  current: z.number().finite(),
  target: z.number().finite(),
  direction,
  weight: z.number().finite().nonnegative().max(100).optional(),
})

const optimizationCandidateSchema = z.object({
  id: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(240),
  expectedImpact: z.number().finite().min(0).max(1),
  confidence: z.number().finite().min(0).max(1),
  risk,
  cost: z.number().finite().nonnegative().max(1_000_000_000).optional(),
  reversible: z.boolean().optional(),
  affectedMetrics: z.array(z.string().trim().min(1).max(120)).min(1).max(50),
})

const optimizationPolicySchema = z.object({
  maximumCandidates: z.number().int().min(1).max(25).optional(),
  maximumCost: z.number().finite().nonnegative().max(1_000_000_000).optional(),
  minimumConfidence: z.number().finite().min(0).max(1).optional(),
  allowedRisk: risk.optional(),
  requireApprovalForMediumRisk: z.boolean().optional(),
  allowIrreversible: z.boolean().optional(),
})

const optimizationRequestSchema = z.object({
  metrics: z.array(optimizationMetricSchema).min(1).max(100),
  candidates: z.array(optimizationCandidateSchema).min(1).max(100),
  policy: optimizationPolicySchema.optional(),
})

const counterfactualScenarioSchema = z.object({
  id: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(240),
  expectedOutcome: z.number().finite(),
  confidence: z.number().finite().min(0).max(1),
  cost: z.number().finite().nonnegative().max(1_000_000_000),
  risk,
  reversible: z.boolean(),
  assumptions: z.array(z.string().trim().min(1).max(500)).max(50).optional(),
})

const counterfactualPolicySchema = z.object({
  minConfidence: z.number().finite().min(0).max(1).optional(),
  maxCost: z.number().finite().nonnegative().max(1_000_000_000).optional(),
  allowedRisk: z.array(risk).min(1).max(3).optional(),
  requireReversible: z.boolean().optional(),
  requireApprovalFor: z.array(risk).max(3).optional(),
})

const counterfactualRequestSchema = z.object({
  scenarios: z.array(counterfactualScenarioSchema).min(1).max(100),
  policy: counterfactualPolicySchema.optional(),
})

type ValidatedMetric = z.infer<typeof optimizationMetricSchema>
type ValidatedCandidate = z.infer<typeof optimizationCandidateSchema>
type ValidatedOptimizationPolicy = z.infer<typeof optimizationPolicySchema>
type ValidatedScenario = z.infer<typeof counterfactualScenarioSchema>
type ValidatedCounterfactualPolicy = z.infer<typeof counterfactualPolicySchema>

function normalizeMetric(metric: ValidatedMetric): BlackstarOptimizationMetric {
  return {
    id: metric.id,
    current: metric.current,
    target: metric.target,
    direction: metric.direction,
    ...(metric.weight !== undefined ? { weight: metric.weight } : {}),
  }
}

function normalizeCandidate(candidate: ValidatedCandidate): BlackstarOptimizationCandidate {
  return {
    id: candidate.id,
    title: candidate.title,
    expectedImpact: candidate.expectedImpact,
    confidence: candidate.confidence,
    risk: candidate.risk,
    affectedMetrics: candidate.affectedMetrics,
    ...(candidate.cost !== undefined ? { cost: candidate.cost } : {}),
    ...(candidate.reversible !== undefined ? { reversible: candidate.reversible } : {}),
  }
}

function normalizeOptimizationPolicy(policy: ValidatedOptimizationPolicy | undefined): BlackstarOptimizationPolicy {
  if (!policy) return {}
  return {
    ...(policy.maximumCandidates !== undefined ? { maximumCandidates: policy.maximumCandidates } : {}),
    ...(policy.maximumCost !== undefined ? { maximumCost: policy.maximumCost } : {}),
    ...(policy.minimumConfidence !== undefined ? { minimumConfidence: policy.minimumConfidence } : {}),
    ...(policy.allowedRisk !== undefined ? { allowedRisk: policy.allowedRisk } : {}),
    ...(policy.requireApprovalForMediumRisk !== undefined
      ? { requireApprovalForMediumRisk: policy.requireApprovalForMediumRisk }
      : {}),
    ...(policy.allowIrreversible !== undefined ? { allowIrreversible: policy.allowIrreversible } : {}),
  }
}

function normalizeScenario(scenario: ValidatedScenario): CounterfactualScenario {
  return {
    id: scenario.id,
    label: scenario.label,
    expectedOutcome: scenario.expectedOutcome,
    confidence: scenario.confidence,
    cost: scenario.cost,
    risk: scenario.risk,
    reversible: scenario.reversible,
    ...(scenario.assumptions !== undefined ? { assumptions: scenario.assumptions } : {}),
  }
}

function normalizeCounterfactualPolicy(policy: ValidatedCounterfactualPolicy | undefined): CounterfactualPolicy {
  if (!policy) return {}
  return {
    ...(policy.minConfidence !== undefined ? { minConfidence: policy.minConfidence } : {}),
    ...(policy.maxCost !== undefined ? { maxCost: policy.maxCost } : {}),
    ...(policy.allowedRisk !== undefined ? { allowedRisk: policy.allowedRisk } : {}),
    ...(policy.requireReversible !== undefined ? { requireReversible: policy.requireReversible } : {}),
    ...(policy.requireApprovalFor !== undefined ? { requireApprovalFor: policy.requireApprovalFor } : {}),
  }
}

export function validateOptimizationDecisionRequest(input: unknown) {
  return optimizationRequestSchema.parse(input)
}

export function validateCounterfactualDecisionRequest(input: unknown) {
  return counterfactualRequestSchema.parse(input)
}

export const planBlackstarOptimizationDecision = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateOptimizationDecisionRequest)
  .handler(async ({ data }) => {
    return buildBlackstarOptimizationPlan(
      data.metrics.map(normalizeMetric),
      data.candidates.map(normalizeCandidate),
      normalizeOptimizationPolicy(data.policy),
    )
  })

export const evaluateBlackstarCounterfactuals = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateCounterfactualDecisionRequest)
  .handler(async ({ data }) => {
    const scenarios = data.scenarios.map(normalizeScenario)
    const policy = normalizeCounterfactualPolicy(data.policy)
    const ranked = rankCounterfactuals(scenarios, policy)
    return {
      ranked,
      selected: selectCounterfactual(scenarios, policy),
      requiresApproval: ranked.some((scenario) => scenario.allowed && scenario.requiresApproval),
    }
  })
