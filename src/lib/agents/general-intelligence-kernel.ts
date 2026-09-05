import type { OrchestratorCandidate } from "./agent-orchestrator";
import { shortlistAgents } from "./agent-orchestrator";

export type GeneralIntelligenceMode = "direct" | "delegate" | "collective" | "escalate";

export type GeneralIntelligenceGoal = {
  objective: string;
  context: string[];
  constraints: string[];
  success_criteria: string[];
  domains: string[];
};

export type GeneralIntelligenceAssessment = {
  version: 1;
  goal: GeneralIntelligenceGoal;
  mode: GeneralIntelligenceMode;
  confidence: number;
  novelty: number;
  ambiguity: number;
  risk: number;
  selected_agent_ids: string[];
  reasons: string[];
  requires_approval: boolean;
  requires_verification: boolean;
  collective_intelligence_recommended: boolean;
};

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const cleanList = (value: unknown, limit: number, max: number): string[] =>
  Array.isArray(value) ? value.map((item) => clean(item, max)).filter(Boolean).slice(0, limit) : [];

const clamp01 = (value: unknown, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(Math.max(number, 0), 1) : fallback;
};

function inferDomains(goal: string): string[] {
  const text = goal.toLowerCase();
  const catalogue: Array<[string, string[]]> = [
    ["research", ["research", "investigate", "compare", "evidence", "market"]],
    ["engineering", ["build", "code", "implement", "debug", "deploy", "software"]],
    ["operations", ["operate", "workflow", "process", "schedule", "monitor"]],
    ["commerce", ["store", "shopify", "etsy", "sales", "commerce", "customer"]],
    ["creative", ["write", "design", "image", "video", "brand", "creative"]],
    ["analysis", ["analyse", "analyze", "forecast", "model", "calculate", "reason"]],
  ];
  return catalogue
    .filter(([, terms]) => terms.some((term) => text.includes(term)))
    .map(([domain]) => domain)
    .slice(0, 8);
}

export function normaliseGeneralIntelligenceGoal(value: unknown): GeneralIntelligenceGoal {
  const row = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
  const objective = clean(row["objective"], 12_000);
  const explicitDomains = cleanList(row["domains"], 8, 80);
  return {
    objective,
    context: cleanList(row["context"], 30, 1200),
    constraints: cleanList(row["constraints"], 30, 800),
    success_criteria: cleanList(row["success_criteria"], 20, 600),
    domains: explicitDomains.length ? explicitDomains : inferDomains(objective),
  };
}

export function assessGeneralIntelligenceGoal(args: {
  goal: GeneralIntelligenceGoal;
  candidates: OrchestratorCandidate[];
  confidence?: number;
  novelty?: number;
  ambiguity?: number;
  risk?: number;
  forceApproval?: boolean;
  maxAgents?: number;
}): GeneralIntelligenceAssessment {
  const confidence = clamp01(args.confidence, 0.7);
  const novelty = clamp01(args.novelty, 0.3);
  const ambiguity = clamp01(args.ambiguity, 0.2);
  const risk = clamp01(args.risk, 0.2);
  const maxAgents = Math.min(Math.max(Math.round(args.maxAgents ?? 4), 1), 8);
  const shortlist = args.goal.objective
    ? shortlistAgents(args.goal.objective, args.candidates, maxAgents)
    : [];

  const lowConfidence = confidence < 0.55;
  const highNovelty = novelty >= 0.7;
  const highAmbiguity = ambiguity >= 0.65;
  const highRisk = risk >= 0.65;
  const noCapability = shortlist.length === 0;
  const crossDomain = args.goal.domains.length >= 2;
  const collective = highNovelty || highAmbiguity || (crossDomain && confidence < 0.75);

  let mode: GeneralIntelligenceMode = "direct";
  if (highRisk || noCapability) mode = "escalate";
  else if (collective || lowConfidence) mode = "collective";
  else if (shortlist.length > 1 || crossDomain) mode = "delegate";

  const reasons: string[] = [];
  if (crossDomain) reasons.push("Objective spans multiple knowledge or execution domains.");
  if (highNovelty) reasons.push("Novelty is high enough to warrant broader reasoning coverage.");
  if (highAmbiguity) reasons.push("Ambiguity is high enough to require clarification or consensus.");
  if (lowConfidence) reasons.push("Confidence is below the autonomous execution threshold.");
  if (highRisk) reasons.push("Risk is above the autonomous execution threshold.");
  if (noCapability) reasons.push("No authorised candidate capability matched the objective.");
  if (!reasons.length) reasons.push("Existing Blackstar capabilities can address the objective within current bounds.");

  return {
    version: 1,
    goal: args.goal,
    mode,
    confidence,
    novelty,
    ambiguity,
    risk,
    selected_agent_ids: shortlist.map((candidate) => candidate.id),
    reasons,
    requires_approval: args.forceApproval === true || highRisk,
    requires_verification: true,
    collective_intelligence_recommended: collective || lowConfidence,
  };
}

export function renderGeneralIntelligenceControlPrompt(assessment: GeneralIntelligenceAssessment): string {
  return [
    "BLACKSTAR GENERAL INTELLIGENCE CONTROL",
    `Objective: ${assessment.goal.objective}`,
    `Mode: ${assessment.mode}`,
    `Domains: ${assessment.goal.domains.join(", ") || "unspecified"}`,
    `Confidence: ${Math.round(assessment.confidence * 100)}%`,
    `Novelty: ${Math.round(assessment.novelty * 100)}%`,
    `Ambiguity: ${Math.round(assessment.ambiguity * 100)}%`,
    `Risk: ${Math.round(assessment.risk * 100)}%`,
    `Selected authorised agents: ${assessment.selected_agent_ids.join(", ") || "none"}`,
    `Approval required: ${assessment.requires_approval ? "yes" : "no"}`,
    `Verification required: ${assessment.requires_verification ? "yes" : "no"}`,
    `Collective intelligence recommended: ${assessment.collective_intelligence_recommended ? "yes" : "no"}`,
    `Reasons: ${assessment.reasons.join(" | ")}`,
    "Control rule: pursue the user objective through existing Blackstar agents, tools, memory, approvals and verification. Never invent permissions, bypass approval boundaries, or claim success without evidence.",
  ].join("\n");
}
