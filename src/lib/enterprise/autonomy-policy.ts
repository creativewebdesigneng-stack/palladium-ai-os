export type EnterpriseAutonomyPolicy = {
  maxConcurrentRuns: number;
  maxDailySpendMicros: number;
  requireApprovalForExternalWrites: boolean;
  requireApprovalForFinancialActions: boolean;
  allowedProviders: string[];
  allowedCapabilities: string[];
};

export type EnterpriseAutonomyAction = {
  activeRuns: number;
  dailySpendMicros: number;
  estimatedCostMicros: number;
  provider: string | null;
  capability: string;
  externalWrite: boolean;
  financialAction: boolean;
};

export type EnterpriseAutonomyDecision = {
  allowed: boolean;
  requiresApproval: boolean;
  blockers: string[];
};

export function evaluateEnterpriseAutonomy(policy: EnterpriseAutonomyPolicy, action: EnterpriseAutonomyAction): EnterpriseAutonomyDecision {
  const blockers: string[] = [];
  let requiresApproval = false;

  if (!Number.isSafeInteger(policy.maxConcurrentRuns) || policy.maxConcurrentRuns < 1) throw new Error("ENTERPRISE_POLICY_INVALID");
  if (!Number.isSafeInteger(policy.maxDailySpendMicros) || policy.maxDailySpendMicros < 0) throw new Error("ENTERPRISE_POLICY_INVALID");
  if (!Number.isSafeInteger(action.activeRuns) || action.activeRuns < 0) throw new Error("ENTERPRISE_ACTION_INVALID");
  if (!Number.isSafeInteger(action.dailySpendMicros) || action.dailySpendMicros < 0) throw new Error("ENTERPRISE_ACTION_INVALID");
  if (!Number.isSafeInteger(action.estimatedCostMicros) || action.estimatedCostMicros < 0) throw new Error("ENTERPRISE_ACTION_INVALID");

  if (action.activeRuns >= policy.maxConcurrentRuns) blockers.push("concurrency_limit_reached");
  if (action.dailySpendMicros + action.estimatedCostMicros > policy.maxDailySpendMicros) blockers.push("daily_spend_limit_exceeded");

  const allowedProviders = new Set(policy.allowedProviders.map((value) => value.trim()).filter(Boolean));
  if (action.provider && allowedProviders.size > 0 && !allowedProviders.has(action.provider)) blockers.push("provider_not_allowed");

  const allowedCapabilities = new Set(policy.allowedCapabilities.map((value) => value.trim()).filter(Boolean));
  if (allowedCapabilities.size > 0 && !allowedCapabilities.has(action.capability)) blockers.push("capability_not_allowed");

  if (action.externalWrite && policy.requireApprovalForExternalWrites) requiresApproval = true;
  if (action.financialAction && policy.requireApprovalForFinancialActions) requiresApproval = true;

  return { allowed: blockers.length === 0, requiresApproval: blockers.length === 0 && requiresApproval, blockers };
}
