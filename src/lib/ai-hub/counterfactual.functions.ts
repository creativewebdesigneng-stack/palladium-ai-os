import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import {
  rankCounterfactuals,
  selectCounterfactual,
  type CounterfactualPolicy,
  type CounterfactualScenario,
} from './counterfactual'

const risk = z.enum(['low', 'medium', 'high'])

const scenarioSchema = z.object({
  id: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(240),
  expectedOutcome: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  cost: z.number().nonnegative().max(1_000_000_000),
  risk,
  reversible: z.boolean(),
  assumptions: z.array(z.string().trim().min(1).max(500)).max(20).optional(),
})

const policySchema = z.object({
  minConfidence: z.number().min(0).max(1).optional(),
  maxCost: z.number().nonnegative().max(1_000_000_000).optional(),
  allowedRisk: z.array(risk).min(1).max(3).optional(),
  requireReversible: z.boolean().optional(),
  requireApprovalFor: z.array(risk).max(3).optional(),
})

const inputSchema = z.object({
  decisionId: z.string().trim().min(1).max(120),
  scenarios: z.array(scenarioSchema).min(2).max(20),
  policy: policySchema.optional(),
})

type ValidatedInput = z.infer<typeof inputSchema>

export function validateCounterfactualRequest(input: unknown): ValidatedInput {
  return inputSchema.parse(input)
}

function normalizeScenario(scenario: z.infer<typeof scenarioSchema>): CounterfactualScenario {
  return {
    id: scenario.id,
    label: scenario.label,
    expectedOutcome: scenario.expectedOutcome,
    confidence: scenario.confidence,
    cost: scenario.cost,
    risk: scenario.risk,
    reversible: scenario.reversible,
    ...(scenario.assumptions ? { assumptions: [...new Set(scenario.assumptions)] } : {}),
  }
}

function normalizePolicy(policy: z.infer<typeof policySchema> | undefined): CounterfactualPolicy {
  if (!policy) return {}
  return {
    ...(policy.minConfidence !== undefined ? { minConfidence: policy.minConfidence } : {}),
    ...(policy.maxCost !== undefined ? { maxCost: policy.maxCost } : {}),
    ...(policy.allowedRisk !== undefined ? { allowedRisk: [...new Set(policy.allowedRisk)] } : {}),
    ...(policy.requireReversible !== undefined ? { requireReversible: policy.requireReversible } : {}),
    ...(policy.requireApprovalFor !== undefined
      ? { requireApprovalFor: [...new Set(policy.requireApprovalFor)] }
      : {}),
  }
}

/**
 * Authenticated, side-effect-free planning boundary for Blackstar's counterfactual engine.
 * It compares bounded operator-supplied alternatives only; any chosen action must still
 * execute through the existing AI Hub / Agent Runtime approval boundary.
 */
export const planBlackstarCounterfactualDecision = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateCounterfactualRequest)
  .handler(async ({ data }) => {
    const scenarios = data.scenarios.map(normalizeScenario)
    const policy = normalizePolicy(data.policy)
    const ranked = rankCounterfactuals(scenarios, policy)
    const selected = selectCounterfactual(scenarios, policy)

    return {
      decisionId: data.decisionId,
      selected,
      ranked,
      executable: Boolean(selected),
      requiresApproval: Boolean(selected?.requiresApproval),
    }
  })
