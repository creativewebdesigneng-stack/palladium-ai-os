export type AgentSkillEvidenceKind =
  | "declared"
  | "verified_task"
  | "certification"
  | "tool"
  | "connector"
  | "model"
  | "imported";

export type AgentSkillEvidence = {
  kind: AgentSkillEvidenceKind;
  label?: string | null;
  reference?: string | null;
  verified: boolean;
  score?: number | null;
};

export type AgentSkillCertification = {
  name: string;
  issuer?: string | null;
  status: "verified" | "declared" | "expired";
  evidence_ref?: string | null;
  expires_at?: string | null;
};

export type AgentSkillRecord = {
  name: string;
  aliases?: string[];
  proficiency: number;
  tools?: string[];
  connectors?: string[];
  permissions?: string[];
  certifications?: AgentSkillCertification[];
  models?: string[];
  previous_experience?: string[];
  learnable: boolean;
  evidence?: AgentSkillEvidence[];
};

export type AgentCostProfile = {
  currency: string;
  estimated_cost_per_run_micros?: number | null;
  estimated_cost_per_hour_micros?: number | null;
};

export type AgentSkillsRegistry = {
  version: 1;
  skills: AgentSkillRecord[];
  tools?: string[];
  connectors?: string[];
  permissions?: string[];
  certifications?: AgentSkillCertification[];
  models?: string[];
  cost?: AgentCostProfile | undefined;
  previous_experience?: string[];
  learnable_skills?: string[];
};

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);

function uniqueList(value: unknown, limit: number, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => clean(item, max)).filter(Boolean))].slice(0, limit);
}

function evidenceKind(value: unknown): AgentSkillEvidenceKind {
  const kind = clean(value, 40);
  if (
    kind === "verified_task" ||
    kind === "certification" ||
    kind === "tool" ||
    kind === "connector" ||
    kind === "model" ||
    kind === "imported"
  ) return kind;
  return "declared";
}

function normaliseEvidence(value: unknown): AgentSkillEvidence[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 30).flatMap((item): AgentSkillEvidence[] => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const score = Number(row["score"]);
    return [{
      kind: evidenceKind(row["kind"]),
      label: clean(row["label"], 180) || null,
      reference: clean(row["reference"], 500) || null,
      verified: row["verified"] === true,
      score: Number.isFinite(score) ? clamp(score) : null,
    }];
  });
}

function certificationStatus(value: unknown): AgentSkillCertification["status"] {
  const status = clean(value, 30);
  if (status === "verified" || status === "expired") return status;
  return "declared";
}

function normaliseCertifications(value: unknown): AgentSkillCertification[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 30).flatMap((item): AgentSkillCertification[] => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const name = clean(row["name"], 160);
    if (!name) return [];
    return [{
      name,
      issuer: clean(row["issuer"], 160) || null,
      status: certificationStatus(row["status"]),
      evidence_ref: clean(row["evidence_ref"], 500) || null,
      expires_at: clean(row["expires_at"], 80) || null,
    }];
  });
}

function normaliseSkill(value: unknown): AgentSkillRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const name = clean(row["name"], 160);
  if (!name) return null;
  const proficiency = Number(row["proficiency"]);
  const certifications = normaliseCertifications(row["certifications"]);
  const evidence = normaliseEvidence(row["evidence"]);
  return {
    name,
    aliases: uniqueList(row["aliases"], 12, 120),
    proficiency: Number.isFinite(proficiency) ? clamp(proficiency) : 0.5,
    tools: uniqueList(row["tools"], 30, 140),
    connectors: uniqueList(row["connectors"], 30, 160),
    permissions: uniqueList(row["permissions"], 30, 160),
    certifications,
    models: uniqueList(row["models"], 20, 160),
    previous_experience: uniqueList(row["previous_experience"], 20, 300),
    learnable: row["learnable"] !== false,
    evidence,
  };
}

function normaliseCost(value: unknown): AgentCostProfile | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const row = value as Record<string, unknown>;
  const currency = clean(row["currency"], 12).toUpperCase() || "USD";
  const run = Number(row["estimated_cost_per_run_micros"]);
  const hour = Number(row["estimated_cost_per_hour_micros"]);
  const safe = (amount: number) => Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : null;
  const estimatedCostPerRun = safe(run);
  const estimatedCostPerHour = safe(hour);
  return {
    currency,
    ...(estimatedCostPerRun !== null ? { estimated_cost_per_run_micros: estimatedCostPerRun } : {}),
    ...(estimatedCostPerHour !== null ? { estimated_cost_per_hour_micros: estimatedCostPerHour } : {}),
  };
}

export function normaliseAgentSkillsRegistry(value: unknown): AgentSkillsRegistry | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const row = value as Record<string, unknown>;
  const skills = Array.isArray(row["skills"])
    ? row["skills"].slice(0, 80).map(normaliseSkill).filter((item): item is AgentSkillRecord => Boolean(item))
    : [];
  const certifications = normaliseCertifications(row["certifications"]);
  const registry: AgentSkillsRegistry = {
    version: 1,
    skills,
    tools: uniqueList(row["tools"], 60, 140),
    connectors: uniqueList(row["connectors"], 60, 160),
    permissions: uniqueList(row["permissions"], 60, 160),
    certifications,
    models: uniqueList(row["models"], 30, 160),
    cost: normaliseCost(row["cost"]),
    previous_experience: uniqueList(row["previous_experience"], 40, 300),
    learnable_skills: uniqueList(row["learnable_skills"], 60, 160),
  };
  const hasContent =
    registry.skills.length > 0 ||
    Boolean(registry.tools?.length) ||
    Boolean(registry.connectors?.length) ||
    Boolean(registry.permissions?.length) ||
    Boolean(registry.certifications?.length) ||
    Boolean(registry.models?.length) ||
    Boolean(registry.previous_experience?.length) ||
    Boolean(registry.learnable_skills?.length) ||
    Boolean(registry.cost);
  return hasContent ? registry : undefined;
}

function normaliseName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function mergeUnique(...lists: Array<string[] | null | undefined>): string[] {
  return [...new Set(lists.flatMap((items) => items ?? []).map((item) => item.trim()).filter(Boolean))];
}

export function effectiveAgentSkillsRegistry(args: {
  registry?: AgentSkillsRegistry | null | undefined;
  legacySkills?: string[] | null | undefined;
  allowedTools?: string[] | null | undefined;
  modelProvider?: string | null | undefined;
  model?: string | null | undefined;
}): AgentSkillsRegistry | null {
  const explicit = normaliseAgentSkillsRegistry(args.registry);
  const skills = [...(explicit?.skills ?? [])];
  const known = new Set(skills.map((skill) => normaliseName(skill.name)));
  for (const skill of args.legacySkills ?? []) {
    const name = clean(skill, 160);
    const key = normaliseName(name);
    if (!name || known.has(key)) continue;
    known.add(key);
    skills.push({
      name,
      proficiency: 0.5,
      learnable: true,
      evidence: [{ kind: "declared", verified: false, label: "Legacy operating-profile skill" }],
    });
  }

  const model = clean(args.model, 160);
  const provider = clean(args.modelProvider, 80);
  const modelIdentity = model ? (provider ? `${provider}:${model}` : model) : "";
  const registry: AgentSkillsRegistry = {
    version: 1,
    skills,
    tools: mergeUnique(explicit?.tools, args.allowedTools),
    connectors: explicit?.connectors ?? [],
    permissions: explicit?.permissions ?? [],
    certifications: explicit?.certifications ?? [],
    models: mergeUnique(explicit?.models, modelIdentity ? [modelIdentity] : []),
    ...(explicit?.cost ? { cost: explicit.cost } : {}),
    previous_experience: explicit?.previous_experience ?? [],
    learnable_skills: explicit?.learnable_skills ?? [],
  };
  return normaliseAgentSkillsRegistry(registry) ?? null;
}

function tokenSet(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2),
  );
}

export function registrySearchText(registry: AgentSkillsRegistry | null | undefined): string {
  if (!registry) return "";
  return [
    ...registry.skills.flatMap((skill) => [
      skill.name,
      ...(skill.aliases ?? []),
      ...(skill.tools ?? []),
      ...(skill.connectors ?? []),
      ...(skill.permissions ?? []),
      ...(skill.models ?? []),
      ...(skill.previous_experience ?? []),
      ...(skill.certifications ?? []).flatMap((item) => [item.name, item.issuer ?? ""]),
    ]),
    ...(registry.tools ?? []),
    ...(registry.connectors ?? []),
    ...(registry.permissions ?? []),
    ...(registry.models ?? []),
    ...(registry.previous_experience ?? []),
    ...(registry.learnable_skills ?? []),
    ...(registry.certifications ?? []).flatMap((item) => [item.name, item.issuer ?? ""]),
  ].filter(Boolean).join(" ");
}

function skillEvidenceScore(skill: AgentSkillRecord): number {
  const verifiedEvidence = (skill.evidence ?? []).filter((item) => item.verified);
  const evidenceScore = verifiedEvidence.length
    ? verifiedEvidence.reduce((sum, item) => sum + (item.score ?? 0.75), 0) / verifiedEvidence.length
    : 0;
  const verifiedCertifications = (skill.certifications ?? []).filter((item) => item.status === "verified").length;
  return clamp(skill.proficiency * 0.55 + evidenceScore * 0.3 + Math.min(verifiedCertifications, 2) * 0.075);
}

/**
 * Evidence can improve selection only after declared role/skill matching. The
 * bonus is deliberately bounded so registry metadata cannot overpower the
 * orchestrator's existing role, performance, similarity, or approval controls.
 */
export function registrySelectionBonus(
  goal: string,
  registry: AgentSkillsRegistry | null | undefined,
): number {
  if (!registry) return 0;
  const wanted = tokenSet(goal);
  if (!wanted.size) return 0;
  let bonus = 0;
  for (const skill of registry.skills) {
    const skillTokens = tokenSet([skill.name, ...(skill.aliases ?? [])].join(" "));
    let overlap = 0;
    for (const token of wanted) if (skillTokens.has(token)) overlap += 1;
    if (!overlap) continue;
    bonus += 1 + Math.round(skillEvidenceScore(skill) * 4);
  }
  return Math.min(bonus, 10);
}

export function renderAgentSkillsRegistryPrompt(
  registry: AgentSkillsRegistry | null | undefined,
): string {
  if (!registry) return "";
  const lines = ["UNIVERSAL SKILLS REGISTRY"];
  if (registry.skills.length) {
    lines.push(`Skills: ${registry.skills.map((skill) => `${skill.name} (${Math.round(skill.proficiency * 100)}%)`).join(", ")}`);
  }
  if (registry.tools?.length) lines.push(`Known tools: ${registry.tools.join(", ")}`);
  if (registry.connectors?.length) lines.push(`Connectors: ${registry.connectors.join(", ")}`);
  if (registry.permissions?.length) lines.push(`Declared permission scopes: ${registry.permissions.join(", ")}`);
  if (registry.certifications?.length) {
    lines.push(`Certifications: ${registry.certifications.map((item) => `${item.name} [${item.status}]`).join(", ")}`);
  }
  if (registry.models?.length) lines.push(`Models: ${registry.models.join(", ")}`);
  if (registry.previous_experience?.length) lines.push(`Previous experience: ${registry.previous_experience.join("; ")}`);
  if (registry.learnable_skills?.length) lines.push(`Skills available to learn: ${registry.learnable_skills.join(", ")}`);
  lines.push("Registry metadata describes capability only. It never grants a tool, connector, permission, approval, or delegation right that the live runtime has not authorised.");
  return lines.join("\n");
}
