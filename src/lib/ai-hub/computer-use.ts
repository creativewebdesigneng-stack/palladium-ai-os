export type BlackstarComputerUseAction =
  | 'navigate'
  | 'read'
  | 'extract'
  | 'click'
  | 'type'
  | 'scroll'
  | 'screenshot'
  | 'back'
  | 'forward'
  | 'wait'
  | 'fill_form'
  | 'storage_state'
  | 'close'

export type BlackstarComputerUseRisk = 'low' | 'medium' | 'high' | 'blocked'

export interface BlackstarComputerUseStep {
  action: BlackstarComputerUseAction
  url?: string
  selector?: string
  text?: string
  fields?: Record<string, string>
  direction?: 'up' | 'down'
  amount?: number
  ms?: number
  purpose?: string
}

export interface BlackstarComputerUsePolicy {
  allowedDomains: string[]
  maximumSteps?: number
  allowTyping?: boolean
  allowFormFill?: boolean
  allowClicks?: boolean
  allowStorageState?: boolean
  requireApprovalForMutations?: boolean
  blockedTerms?: string[]
}

export interface BlackstarComputerUseDecision {
  step: BlackstarComputerUseStep
  risk: BlackstarComputerUseRisk
  allowed: boolean
  requiresApproval: boolean
  policyChecks: string[]
  reason: string
}

export interface BlackstarComputerUsePlan {
  allowedDomains: string[]
  decisions: BlackstarComputerUseDecision[]
  executable: boolean
  requiresApproval: boolean
  blockedCount: number
}

const DEFAULT_BLOCKED_TERMS = [
  'password',
  'passcode',
  'private key',
  'seed phrase',
  'recovery phrase',
  'credit card',
  'card number',
  'cvv',
  'cvc',
  'bank account',
  'sort code',
]

function cleanDomain(value: string) {
  return value.trim().toLowerCase().replace(/^www\./, '')
}

function cleanAllowedDomains(values: string[]) {
  return [...new Set(values.map(cleanDomain).filter(Boolean))].slice(0, 50)
}

function hostAllowed(rawUrl: string, allowedDomains: string[]) {
  try {
    const url = new URL(rawUrl)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
    const host = cleanDomain(url.hostname)
    return allowedDomains.some((domain) => host === domain || host.endsWith(`.${domain}`))
  } catch {
    return false
  }
}

function includesBlockedTerm(value: string, blockedTerms: string[]) {
  const haystack = value.toLowerCase()
  return blockedTerms.some((term) => term && haystack.includes(term))
}

function stepText(step: BlackstarComputerUseStep) {
  return [
    step.purpose ?? '',
    step.selector ?? '',
    step.text ?? '',
    ...Object.entries(step.fields ?? {}).flatMap(([key, value]) => [key, value]),
  ].join(' ')
}

function classifyStep(step: BlackstarComputerUseStep): BlackstarComputerUseRisk {
  switch (step.action) {
    case 'read':
    case 'extract':
    case 'scroll':
    case 'screenshot':
    case 'back':
    case 'forward':
    case 'wait':
    case 'close':
      return 'low'
    case 'navigate':
      return 'low'
    case 'type':
    case 'fill_form':
      return 'medium'
    case 'click':
    case 'storage_state':
      return 'high'
  }
}

export function buildBlackstarComputerUsePlan(
  steps: BlackstarComputerUseStep[],
  policy: BlackstarComputerUsePolicy,
): BlackstarComputerUsePlan {
  const allowedDomains = cleanAllowedDomains(policy.allowedDomains)
  const maximumSteps = Math.max(1, Math.min(100, Math.floor(policy.maximumSteps ?? 30)))
  const blockedTerms = [...DEFAULT_BLOCKED_TERMS, ...(policy.blockedTerms ?? [])]
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean)
  const requireApprovalForMutations = policy.requireApprovalForMutations ?? true

  const decisions = steps.slice(0, maximumSteps).map((step): BlackstarComputerUseDecision => {
    const policyChecks = [
      'action-supported',
      'domain-allow-list',
      'sensitive-data-boundary',
      'mutation-boundary',
      'approval-gate',
    ]

    if (step.url && !hostAllowed(step.url, allowedDomains)) {
      return {
        step,
        risk: 'blocked',
        allowed: false,
        requiresApproval: false,
        policyChecks,
        reason: 'Target URL is outside the governed domain allow-list.',
      }
    }

    if (includesBlockedTerm(stepText(step), blockedTerms)) {
      return {
        step,
        risk: 'blocked',
        allowed: false,
        requiresApproval: false,
        policyChecks,
        reason: 'Step appears to contain credentials, payment data, or another blocked secret class.',
      }
    }

    if (step.action === 'type' && policy.allowTyping === false) {
      return { step, risk: 'blocked', allowed: false, requiresApproval: false, policyChecks, reason: 'Typing is disabled by policy.' }
    }
    if (step.action === 'fill_form' && policy.allowFormFill === false) {
      return { step, risk: 'blocked', allowed: false, requiresApproval: false, policyChecks, reason: 'Form filling is disabled by policy.' }
    }
    if (step.action === 'click' && policy.allowClicks === false) {
      return { step, risk: 'blocked', allowed: false, requiresApproval: false, policyChecks, reason: 'Clicks are disabled by policy.' }
    }
    if (step.action === 'storage_state' && policy.allowStorageState !== true) {
      return { step, risk: 'blocked', allowed: false, requiresApproval: false, policyChecks, reason: 'Storage-state access is disabled by default.' }
    }

    const risk = classifyStep(step)
    const mutating = step.action === 'click' || step.action === 'type' || step.action === 'fill_form'
    const requiresApproval = mutating && requireApprovalForMutations

    return {
      step,
      risk,
      allowed: true,
      requiresApproval,
      policyChecks,
      reason: requiresApproval
        ? 'Step is allowed but crosses the configured mutation approval boundary.'
        : 'Step is allowed within the governed computer-use policy.',
    }
  })

  const blockedCount = decisions.filter((decision) => !decision.allowed).length
  return {
    allowedDomains,
    decisions,
    executable: decisions.length > 0 && blockedCount === 0,
    requiresApproval: decisions.some((decision) => decision.requiresApproval),
    blockedCount,
  }
}
