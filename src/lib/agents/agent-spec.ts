export type AgentKpi = {
  name: string;
  target?: string | number | null;
  unit?: string | null;
  direction?: "higher" | "lower" | "target";
};

export type AgentDelegationPolicy = {
  enabled: boolean;
  allowed_agent_ids: string[];
  max_depth: number;
};

export type AgentOperatingProfile = {
  role?: string;
  objective?: string;
  responsibilities?: string[];
  expected_inputs?: string[];
  expected_outputs?: string[];
  skills?: string[];
  knowledge_sources?: string[];
  success_criteria?: string[];
  kpis?: AgentKpi[];
  delegation?: AgentDelegationPolicy;
  escalation_rules?: string[];
  verification_required?: boolean;
  quality_threshold?: number;
  max_replans?: number;
};

const text = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

function textList(value: unknown, limit: number, itemMax: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => text(item, itemMax))
    .filter(Boolean)
    .slice(0, limit);
}

function normaliseKpis(value: unknown): AgentKpi[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const name = text(row.name, 120);
    if (!name) return [];
    const rawTarget = row.target;
    const target =
      typeof rawTarget === "number" && Number.isFinite(rawTarget)
        ? rawTarget
        : text(rawTarget, 200) || null;
    const direction = ["higher", "lower", "target"].includes(String(row.direction))
      ? (String(row.direction) as AgentKpi["direction"])
      : "target";
    return [{ name, target, unit: text(row.unit, 60) || null, direction }];
  });
}

export function normaliseOperatingProfile(value: unknown): AgentOperatingProfile {
  const input = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
  const delegationInput =
    input.delegation && typeof input.delegation === "object" && !Array.isArray(input.delegation)
      ? (input.delegation as Record<string, unknown>)
      : {};
  const quality = Number(input.quality_threshold);
  const replans = Number(input.max_replans);
  const maxDepth = Number(delegationInput.max_depth);

  const profile: AgentOperatingProfile = {
    role: text(input.role, 160) || undefined,
    objective: text(input.objective, 4000) || undefined,
    responsibilities: textList(input.responsibilities, 24, 500),
    expected_inputs: textList(input.expected_inputs, 20, 500),
    expected_outputs: textList(input.expected_outputs, 20, 500),
    skills: textList(input.skills, 30, 120),
    knowledge_sources: textList(input.knowledge_sources, 30, 300),
    success_criteria: textList(input.success_criteria, 24, 600),
    kpis: normaliseKpis(input.kpis),
    delegation: {
      enabled: delegationInput.enabled === true,
      allowed_agent_ids: textList(delegationInput.allowed_agent_ids, 50, 100),
      max_depth: Number.isFinite(maxDepth) ? Math.min(Math.max(Math.round(maxDepth), 0), 5) : 1,
    },
    escalation_rules: textList(input.escalation_rules, 20, 600),
    verification_required: input.verification_required !== false,
    quality_threshold: Number.isFinite(quality) ? Math.min(Math.max(quality, 0), 1) : 0.8,
    max_replans: Number.isFinite(replans) ? Math.min(Math.max(Math.round(replans), 0), 10) : 3,
  };

  return Object.fromEntries(
    Object.entries(profile).filter(([, item]) => {
      if (Array.isArray(item)) return item.length > 0;
      return item !== undefined;
    }),
  ) as AgentOperatingProfile;
}

export function hasAgentSpecV2(profile: AgentOperatingProfile | null | undefined): boolean {
  if (!profile) return false;
  return Boolean(
    profile.role ||
      profile.objective ||
      profile.responsibilities?.length ||
      profile.success_criteria?.length ||
      profile.kpis?.length,
  );
}

const bullets = (items?: string[]) => items?.length ? items.map((item) => `- ${item}`).join("\n") : "";

export function renderOperatingProfilePrompt(profile: AgentOperatingProfile | null | undefined): string {
  if (!profile || !hasAgentSpecV2(profile)) return "";
  const sections: string[] = ["AGENT OPERATING PROFILE (SPEC V2)"];
  if (profile.role) sections.push(`Role: ${profile.role}`);
  if (profile.objective) sections.push(`Primary objective:\n${profile.objective}`);
  if (profile.responsibilities?.length) sections.push(`Responsibilities:\n${bullets(profile.responsibilities)}`);
  if (profile.expected_inputs?.length) sections.push(`Expected inputs:\n${bullets(profile.expected_inputs)}`);
  if (profile.expected_outputs?.length) sections.push(`Required outputs:\n${bullets(profile.expected_outputs)}`);
  if (profile.skills?.length) sections.push(`Core skills: ${profile.skills.join(", ")}`);
  if (profile.knowledge_sources?.length) sections.push(`Preferred knowledge sources:\n${bullets(profile.knowledge_sources)}`);
  if (profile.success_criteria?.length) sections.push(`Completion criteria — do not claim completion until these are satisfied or explicitly reported as unverifiable:\n${bullets(profile.success_criteria)}`);
  if (profile.kpis?.length) {
    sections.push(`KPIs:\n${profile.kpis.map((kpi) => `- ${kpi.name}${kpi.target !== null && kpi.target !== undefined ? `: ${kpi.target}${kpi.unit ? ` ${kpi.unit}` : ""}` : ""} (${kpi.direction ?? "target"})`).join("\n")}`);
  }
  const delegation = profile.delegation;
  sections.push(
    delegation?.enabled
      ? `Delegation: allowed, maximum depth ${delegation.max_depth ?? 1}. Only delegate to explicitly permitted agents and preserve the operator's tool/approval boundaries.`
      : "Delegation: disabled unless an orchestrator explicitly assigns a workflow handoff.",
  );
  if (profile.escalation_rules?.length) sections.push(`Escalate when:\n${bullets(profile.escalation_rules)}`);
  sections.push(
    `Verification: ${profile.verification_required === false ? "optional" : "required"}. Quality threshold: ${Math.round((profile.quality_threshold ?? 0.8) * 100)}%. Maximum re-plans: ${profile.max_replans ?? 3}.`,
    "Execution discipline: plan before acting when the task has multiple steps; observe tool results; revise the plan when evidence contradicts assumptions; never fabricate completion evidence.",
  );
  return sections.join("\n\n");
}
