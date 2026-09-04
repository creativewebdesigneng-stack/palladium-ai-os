export type PersonalOsPolicy = {
  maxDailySpendMicros: number;
  requireApprovalForMessages: boolean;
  requireApprovalForPurchases: boolean;
  requireApprovalForExternalWrites: boolean;
  allowedCapabilities: string[];
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
};

export type PersonalOsAction = {
  capability: string;
  dailySpendMicros: number;
  estimatedCostMicros: number;
  sendsMessage: boolean;
  purchase: boolean;
  externalWrite: boolean;
  localHour: number;
  urgent: boolean;
};

export type PersonalOsDecision = {
  allowed: boolean;
  requiresApproval: boolean;
  blockers: string[];
};

function inQuietHours(hour: number, start: number | null, end: number | null) {
  if (start === null || end === null || start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

export function evaluatePersonalOsAction(policy: PersonalOsPolicy, action: PersonalOsAction): PersonalOsDecision {
  if (!Number.isSafeInteger(policy.maxDailySpendMicros) || policy.maxDailySpendMicros < 0) throw new Error("PERSONAL_OS_POLICY_INVALID");
  if (!Number.isInteger(action.localHour) || action.localHour < 0 || action.localHour > 23) throw new Error("PERSONAL_OS_ACTION_INVALID");
  if (!Number.isSafeInteger(action.dailySpendMicros) || action.dailySpendMicros < 0) throw new Error("PERSONAL_OS_ACTION_INVALID");
  if (!Number.isSafeInteger(action.estimatedCostMicros) || action.estimatedCostMicros < 0) throw new Error("PERSONAL_OS_ACTION_INVALID");

  const blockers: string[] = [];
  let requiresApproval = false;
  const allowedCapabilities = new Set(policy.allowedCapabilities.map((value) => value.trim()).filter(Boolean));

  if (allowedCapabilities.size > 0 && !allowedCapabilities.has(action.capability)) blockers.push("capability_not_allowed");
  if (action.dailySpendMicros + action.estimatedCostMicros > policy.maxDailySpendMicros) blockers.push("daily_spend_limit_exceeded");
  if (!action.urgent && inQuietHours(action.localHour, policy.quietHoursStart, policy.quietHoursEnd)) blockers.push("quiet_hours");

  if (action.sendsMessage && policy.requireApprovalForMessages) requiresApproval = true;
  if (action.purchase && policy.requireApprovalForPurchases) requiresApproval = true;
  if (action.externalWrite && policy.requireApprovalForExternalWrites) requiresApproval = true;

  return { allowed: blockers.length === 0, requiresApproval: blockers.length === 0 && requiresApproval, blockers };
}
