import {
  normaliseAgentSkillsRegistry,
  type AgentSkillRecord,
  type AgentSkillsRegistry,
} from "./agent-skills-registry";

export type VerifiedSkillFailureSignal = {
  taskId: string;
  verificationScore: number;
  issues: string[];
  evidence?: string[];
};

export type VerifiedSkillFailureResult = {
  registry: AgentSkillsRegistry;
  changed: boolean;
  matched_skills: string[];
  reduced_skills: string[];
};

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function key(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokens(value: string) {
  return new Set(key(value).split(/\s+/).filter((token) => token.length > 2));
}

function capabilityMatches(text: string, name: string, aliases: string[] = []) {
  const normalisedText = key(text);
  const haystack = ` ${normalisedText} `;
  const available = tokens(normalisedText);
  for (const candidate of [name, ...aliases]) {
    const phrase = key(candidate);
    if (!phrase) continue;
    if (haystack.includes(` ${phrase} `)) return true;
    const required = [...tokens(phrase)];
    if (required.length && required.every((token) => available.has(token))) return true;
  }
  return false;
}

function failureEvidence(skill: AgentSkillRecord) {
  return (skill.evidence ?? []).filter((item) =>
    item.kind === "verified_failure" &&
    item.verified &&
    typeof item.reference === "string" &&
    item.reference.length > 0,
  );
}

function addFailureEvidence(skill: AgentSkillRecord, signal: VerifiedSkillFailureSignal) {
  const reference = `task:${clean(signal.taskId, 120)}:verification-failure`;
  const existing = skill.evidence ?? [];
  if (existing.some((item) => item.kind === "verified_failure" && item.reference === reference)) {
    return { skill, changed: false, reduced: false };
  }

  const score = clamp(signal.verificationScore);
  const nextEvidence = [...existing, {
    kind: "verified_failure" as const,
    label: "Verifier-confirmed skill quality failure",
    reference,
    verified: true,
    score,
  }].slice(-30);
  const failures = new Set(
    nextEvidence
      .filter((item) => item.kind === "verified_failure" && item.verified && item.reference)
      .map((item) => item.reference),
  ).size;

  if (failures < 2) {
    return {
      changed: true,
      reduced: false,
      skill: { ...skill, evidence: nextEvidence },
    };
  }

  const decrement = Math.min(0.02, 0.005 + Math.max(0, 0.6 - score) * 0.025);
  const nextProficiency = clamp(skill.proficiency - decrement, 0.2, 1);
  return {
    changed: true,
    reduced: nextProficiency < skill.proficiency,
    skill: {
      ...skill,
      proficiency: nextProficiency,
      evidence: nextEvidence,
    },
  };
}

/**
 * Records bounded negative capability evidence only from explicit verifier
 * feedback. Generic runtime/provider/tool failures are never passed here.
 */
export function applyVerifiedSkillFailure(args: {
  registry: AgentSkillsRegistry;
  signal: VerifiedSkillFailureSignal;
}): VerifiedSkillFailureResult {
  const normalised = normaliseAgentSkillsRegistry(args.registry) ?? {
    version: 1 as const,
    skills: [],
  };
  const score = clamp(Number(args.signal.verificationScore) || 0);
  const supportText = [
    ...(args.signal.issues ?? []),
    ...(args.signal.evidence ?? []),
  ].join(" ");

  if (!clean(args.signal.taskId, 120) || score > 0.6 || !supportText.trim()) {
    return {
      registry: normalised,
      changed: false,
      matched_skills: [],
      reduced_skills: [],
    };
  }

  const matched: string[] = [];
  const reduced: string[] = [];
  let changed = false;

  const skills = normalised.skills.map((skill) => {
    if (!capabilityMatches(supportText, skill.name, skill.aliases ?? [])) return skill;
    matched.push(skill.name);
    const next = addFailureEvidence(skill, args.signal);
    changed = changed || next.changed;
    if (next.reduced) reduced.push(skill.name);
    return next.skill;
  });

  const registry = normaliseAgentSkillsRegistry({
    ...normalised,
    skills,
  }) ?? normalised;

  return {
    registry,
    changed,
    matched_skills: [...new Set(matched)],
    reduced_skills: [...new Set(reduced)],
  };
}
