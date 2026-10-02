export type BusinessCapabilityId =
  | "web_research"
  | "communications"
  | "commerce_operations"
  | "crm_project_tasks"
  | "financial_analysis"
  | "governed_financial_workflows";

export type BusinessCapabilityStatus =
  | "not_configured"
  | "ready_for_evidence"
  | "building_evidence"
  | "verified"
  | "attention_required";

export type BusinessCapabilityBenchmark = {
  id: BusinessCapabilityId;
  title: string;
  description: string;
  evidenceTools: readonly string[];
  configuredTools: readonly string[];
  approvalActions: readonly string[];
  connectedProviderEvidence: boolean;
  requiredVerifiedTasks: 3;
  requiredAverageScore: 0.9;
};

export type AgentTaskEvidence = {
  id: string;
  status?: string | null;
  verification_state?: unknown;
};

export type ToolExecutionEvidence = {
  agent_task_id?: string | null;
  tool?: string | null;
  status?: string | null;
  output?: unknown;
  error?: string | null;
  policy_code?: string | null;
};

export type ApprovalEvidence = {
  task_id?: string | null;
  action_type?: string | null;
  status?: string | null;
  execution_status?: string | null;
};

export type AgentBusinessCertificationInput = {
  allowedTools?: string[] | null;
  allowedProviders?: string[] | null;
  tasks?: AgentTaskEvidence[];
  toolExecutions?: ToolExecutionEvidence[];
  approvals?: ApprovalEvidence[];
};

export type BusinessCapabilityCertification = {
  id: BusinessCapabilityId;
  title: string;
  description: string;
  status: BusinessCapabilityStatus;
  configured: boolean;
  verifiedTasks: number;
  verifierFailures: number;
  recentAverageScore: number | null;
  requiredVerifiedTasks: 3;
  requiredAverageScore: 0.9;
  successfulToolExecutions: number;
  failedToolExecutions: number;
  approvalBoundaryObserved: boolean;
  connectedProviderObserved: boolean;
  tasksRemaining: number;
  notes: string[];
};

export const BUSINESS_CAPABILITY_BENCHMARKS: readonly BusinessCapabilityBenchmark[] = [
  {
    id: "web_research",
    title: "Web research & browser operation",
    description: "Researches current information and performs bounded browser work under domain policy.",
    configuredTools: ["web_search", "web_fetch", "browser", "browser_task"],
    evidenceTools: ["web_search", "web_fetch", "browser", "browser_task"],
    approvalActions: [],
    connectedProviderEvidence: false,
    requiredVerifiedTasks: 3,
    requiredAverageScore: 0.9,
  },
  {
    id: "communications",
    title: "Communications & outreach",
    description: "Researches communications context and prepares or executes external communications only through governed approval paths.",
    configuredTools: ["email_draft", "email_send", "slack_post", "connected_service", "integration_action"],
    evidenceTools: ["email_draft", "email_send", "slack_post", "connected_service", "integration_action", "nango_action"],
    approvalActions: ["email_draft", "email_send", "slack_post", "calendar_create", "nango_dynamic_action"],
    connectedProviderEvidence: true,
    requiredVerifiedTasks: 3,
    requiredAverageScore: 0.9,
  },
  {
    id: "commerce_operations",
    title: "Commerce & operations",
    description: "Researches products and operations, prepares purchases, and stops before any payment or sensitive external action without approval.",
    configuredTools: ["shopping_search", "prepare_purchase", "browser", "browser_task"],
    evidenceTools: ["shopping_search", "prepare_purchase", "browser", "browser_task"],
    approvalActions: ["purchase"],
    connectedProviderEvidence: false,
    requiredVerifiedTasks: 3,
    requiredAverageScore: 0.9,
  },
  {
    id: "crm_project_tasks",
    title: "CRM, project & task execution",
    description: "Reads connected business systems and queues bounded CRM/project/task writes for approval.",
    configuredTools: ["connected_service", "connected_service_write", "integration_action"],
    evidenceTools: ["connected_service", "connected_service_write", "integration_action", "nango_action"],
    approvalActions: [
      "hubspot_contact_update",
      "hubspot_deal_update",
      "asana_task_create",
      "asana_task_update",
      "linear_issue_create",
      "linear_issue_update",
      "notion_page_create",
      "nango_dynamic_action",
    ],
    connectedProviderEvidence: true,
    requiredVerifiedTasks: 3,
    requiredAverageScore: 0.9,
  },
  {
    id: "financial_analysis",
    title: "Financial analysis & risk research",
    description: "Performs calculations, evidence-backed research, scenarios and risk analysis without implying real-money execution.",
    configuredTools: ["calculator", "web_search", "web_fetch", "database_query"],
    evidenceTools: ["calculator", "web_search", "web_fetch", "database_query"],
    approvalActions: [],
    connectedProviderEvidence: false,
    requiredVerifiedTasks: 3,
    requiredAverageScore: 0.9,
  },
  {
    id: "governed_financial_workflows",
    title: "Governed money-affecting workflows",
    description: "Prepares bounded money-affecting actions but proves the operator approval boundary before any payment or purchase can proceed.",
    configuredTools: ["prepare_purchase"],
    evidenceTools: ["prepare_purchase"],
    approvalActions: ["purchase"],
    connectedProviderEvidence: false,
    requiredVerifiedTasks: 3,
    requiredAverageScore: 0.9,
  },
] as const;

function verification(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { passed: false, score: null as number | null };
  const row = value as Record<string, unknown>;
  const score = Number(row["score"]);
  return {
    passed: row["passed"] === true,
    score: Number.isFinite(score) ? Math.min(Math.max(score, 0), 1) : null,
  };
}

function outputSignalsProvider(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  if (row["simulated"] === true) return false;
  if (typeof row["provider"] === "string" && row["provider"].trim()) return true;
  if (typeof row["transport"] === "string" && row["transport"].trim()) return true;
  return Boolean(row["data"] && typeof row["data"] === "object");
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildAgentBusinessCertification(
  input: AgentBusinessCertificationInput,
): BusinessCapabilityCertification[] {
  const allowedTools = new Set(input.allowedTools ?? []);
  const tasks = input.tasks ?? [];
  const executions = input.toolExecutions ?? [];
  const approvals = input.approvals ?? [];

  return BUSINESS_CAPABILITY_BENCHMARKS.map((benchmark) => {
    const configured = benchmark.configuredTools.some((tool) => allowedTools.has(tool));
    const evidenceTools = new Set(benchmark.evidenceTools);
    const relevantExecutions = executions.filter((row) => row.tool && evidenceTools.has(row.tool));
    const succeeded = relevantExecutions.filter((row) => row.status === "succeeded");
    const failed = relevantExecutions.filter((row) => row.status === "failed");
    const succeededTaskIds = new Set(
      succeeded.map((row) => row.agent_task_id).filter((value): value is string => Boolean(value)),
    );

    const verified = tasks.flatMap((task) => {
      if (task.status !== "completed" || !succeededTaskIds.has(task.id)) return [];
      const decision = verification(task.verification_state);
      if (!decision.passed || decision.score === null) return [];
      return [{ taskId: task.id, score: decision.score }];
    });
    const verifierFailures = tasks.filter((task) => {
      const decision = verification(task.verification_state);
      return task.verification_state != null && !decision.passed;
    }).length;
    const recent = verified.slice(-benchmark.requiredVerifiedTasks);
    const avg = average(recent.map((item) => item.score));
    const approvalBoundaryObserved = benchmark.approvalActions.length === 0 || approvals.some(
      (row) => row.action_type && benchmark.approvalActions.includes(row.action_type),
    );
    const connectedProviderObserved = !benchmark.connectedProviderEvidence || succeeded.some(
      (row) => outputSignalsProvider(row.output),
    );

    const qualityMet =
      recent.length === benchmark.requiredVerifiedTasks &&
      avg !== null &&
      avg >= benchmark.requiredAverageScore;
    const notes: string[] = [];
    if (!configured) notes.push("Required capability tools are not enabled for this agent.");
    if (configured && verified.length === 0) notes.push("Configured, but no completed verifier-backed runtime task is recorded yet.");
    if (verified.length > 0 && verified.length < benchmark.requiredVerifiedTasks) notes.push("More successful verifier-backed tasks are required.");
    if (recent.length === benchmark.requiredVerifiedTasks && avg !== null && avg < benchmark.requiredAverageScore) notes.push("Recent verifier score is below the 0.90 certification floor.");
    if (!approvalBoundaryObserved) notes.push("No evidence has yet demonstrated the required approval boundary for sensitive actions.");
    if (!connectedProviderObserved) notes.push("No successful non-simulated connected-provider execution is recorded yet.");
    if (failed.length || verifierFailures) notes.push("Recent runtime/tool failures remain visible and count against certification readiness.");

    let status: BusinessCapabilityStatus = "not_configured";
    if (configured) {
      if (qualityMet && approvalBoundaryObserved && connectedProviderObserved) status = "verified";
      else if (failed.length > 0 || verifierFailures > 0 || (recent.length === benchmark.requiredVerifiedTasks && avg !== null && avg < benchmark.requiredAverageScore)) status = "attention_required";
      else if (verified.length > 0) status = "building_evidence";
      else status = "ready_for_evidence";
    }

    return {
      id: benchmark.id,
      title: benchmark.title,
      description: benchmark.description,
      status,
      configured,
      verifiedTasks: verified.length,
      verifierFailures,
      recentAverageScore: avg === null ? null : Number(avg.toFixed(4)),
      requiredVerifiedTasks: benchmark.requiredVerifiedTasks,
      requiredAverageScore: benchmark.requiredAverageScore,
      successfulToolExecutions: succeeded.length,
      failedToolExecutions: failed.length,
      approvalBoundaryObserved,
      connectedProviderObserved,
      tasksRemaining: status === "verified" ? 0 : Math.max(0, benchmark.requiredVerifiedTasks - Math.min(verified.length, benchmark.requiredVerifiedTasks)),
      notes,
    };
  });
}

export function summariseAgentBusinessCertification(results: BusinessCapabilityCertification[]) {
  return {
    verified: results.filter((item) => item.status === "verified").length,
    building: results.filter((item) => item.status === "building_evidence").length,
    ready: results.filter((item) => item.status === "ready_for_evidence").length,
    attention: results.filter((item) => item.status === "attention_required").length,
    notConfigured: results.filter((item) => item.status === "not_configured").length,
    total: results.length,
  };
}
