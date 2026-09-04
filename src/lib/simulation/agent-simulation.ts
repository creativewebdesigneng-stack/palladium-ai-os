export type SimulationRisk = "low" | "medium" | "high" | "critical";
export type SimulationAction = "reasoning" | "model" | "tool_read" | "tool_write" | "external_write" | "financial";

export type SimulationStep = {
  id: string;
  action: SimulationAction;
  risk: SimulationRisk;
  estimatedCostMicros: number;
  requiresApproval?: boolean | undefined;
};

export type SimulationPolicy = {
  maxCostMicros: number;
  maxRiskScore: number;
  approvalRisk: "high" | "critical";
};

export type SimulationResult = {
  status: "pass" | "needs_approval" | "blocked";
  projectedCostMicros: number;
  riskScore: number;
  approvalStepIds: string[];
  suppressedSideEffectStepIds: string[];
  findings: string[];
  executableSteps: number;
  totalSteps: number;
};

const riskWeight: Record<SimulationRisk, number> = {
  low: 1,
  medium: 3,
  high: 6,
  critical: 10,
};

const riskRank: Record<SimulationRisk, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const sideEffectActions = new Set<SimulationAction>(["tool_write", "external_write", "financial"]);

function assertMicros(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("SIMULATION_INVALID_COST");
}

export function simulateAgentPlan(steps: SimulationStep[], policy: SimulationPolicy): SimulationResult {
  assertMicros(policy.maxCostMicros);
  if (!Number.isSafeInteger(policy.maxRiskScore) || policy.maxRiskScore < 0) throw new Error("SIMULATION_INVALID_POLICY");

  const ids = new Set<string>();
  let projectedCostMicros = 0;
  let riskScore = 0;
  const approvalStepIds: string[] = [];
  const suppressedSideEffectStepIds: string[] = [];

  for (const step of steps) {
    if (!step.id.trim() || ids.has(step.id)) throw new Error("SIMULATION_INVALID_STEP");
    ids.add(step.id);
    assertMicros(step.estimatedCostMicros);
    projectedCostMicros += step.estimatedCostMicros;
    if (!Number.isSafeInteger(projectedCostMicros)) throw new Error("SIMULATION_INVALID_COST");
    riskScore += riskWeight[step.risk];

    if (sideEffectActions.has(step.action)) suppressedSideEffectStepIds.push(step.id);
    if (step.requiresApproval || riskRank[step.risk] >= riskRank[policy.approvalRisk]) approvalStepIds.push(step.id);
  }

  const findings: string[] = [];
  if (projectedCostMicros > policy.maxCostMicros) findings.push("PROJECTED_COST_EXCEEDS_POLICY");
  if (riskScore > policy.maxRiskScore) findings.push("PROJECTED_RISK_EXCEEDS_POLICY");
  if (suppressedSideEffectStepIds.length > 0) findings.push("SIDE_EFFECTS_SUPPRESSED");
  if (approvalStepIds.length > 0) findings.push("APPROVAL_REQUIRED");

  const blocked = findings.includes("PROJECTED_COST_EXCEEDS_POLICY") || findings.includes("PROJECTED_RISK_EXCEEDS_POLICY");
  const status: SimulationResult["status"] = blocked ? "blocked" : approvalStepIds.length > 0 ? "needs_approval" : "pass";

  return {
    status,
    projectedCostMicros,
    riskScore,
    approvalStepIds,
    suppressedSideEffectStepIds,
    findings,
    executableSteps: steps.length - suppressedSideEffectStepIds.length,
    totalSteps: steps.length,
  };
}
