import {
  normaliseAgentSkillsRegistry,
  type AgentSkillCertification,
  type AgentSkillRecord,
  type AgentSkillsRegistry,
} from "./agent-skills-registry";

export type VerifiedSkillLearningSignal = {
  taskId: string;
  objective: string;
  verifiedOutcome?: string;
  verificationScore: number;
  evidence?: string[];
  completedSteps?: string[];
};

export type VerifiedSkillLearningResult = {
  registry: AgentSkillsRegistry;
  changed: boolean;
  matched_skills: string[];
  promoted_skills: string[];
  certifications_awarded: string[];
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

function recentCapabilityEvidence(skill: AgentSkillRecord) {
  return (skill.evidence ?? [])
    .filter((item) =>
      item.verified &&
      (item.kind === "verified_task" || item.kind === "verified_failure") &&
      typeof item.reference === "string" &&
      item.reference.length > 0,
    )
    .slice(-3);
}

function certificationName(skillName: string) {
  return `Blackstar Verified — ${skillName}`;
}

function isSameCertification(a: AgentSkillCertification, b: AgentSkillCertification) {
  return key(a.name) === key(b.name) && key(a.issuer ?? "") === key(b.issuer ?? "");
}

function upsertCertification(
  certifications: AgentSkillCertification[],
  certification: AgentSkillCertification,
) {
  const index = certifications.findIndex((item) => isSameCertification(item, certification));
  if (index === -1) return [...certifications, certification];
  const existing = certifications[index];
  if (
    existing?.status === certification.status &&
    existing?.evidence_ref === certification.evidence_ref
  ) return certifications;
  const next = [...certifications];
  next[index] = { ...existing, ...certification };
  return next;
}

function maybeCertification(skill: AgentSkillRecord): AgentSkillCertification | null {
  const evidence = recentCapabilityEvidence(skill);
  if (evidence.length < 3 || evidence.some((item) => item.kind !== "verified_task")) return null;
  const scores = evidence
    .map((item) => Number(item.score))
    .filter((score) => Number.isFinite(score));
  if (scores.length < 3) return null;
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  if (average < 0.9) return null;
  return {
    name: certificationName(skill.name),
    issuer: "Blackstar runtime verifier",
    status: "verified",
    evidence_ref: `blackstar:verified-skill:${key(skill.name).replace(/\s+/g, "-")}`,
  };
}

function addVerifiedEvidence(skill: AgentSkillRecord, signal: VerifiedSkillLearningSignal) {
  const reference = `task:${clean(signal.taskId, 120)}`;
  const existing = skill.evidence ?? [];
  if (existing.some((item) => item.kind === "verified_task" && item.reference === reference)) {
    return { skill, changed: false };
  }
  const nextEvidence = [...existing, {
    kind: "verified_task" as const,
    label: "Verifier-approved task completion",
    reference,
    verified: true,
    score: clamp(signal.verificationScore),
  }].slice(-30);
  const score = clamp(signal.verificationScore);
  const gain = Math.min(0.04, Math.max(0.01, (score - 0.7) * 0.1));
  return {
    changed: true,
    skill: {
      ...skill,
      proficiency: clamp(skill.proficiency + (1 - skill.proficiency) * gain),
      evidence: nextEvidence,
    },
  };
}

/**
 * Converts verifier-approved task outcomes into bounded registry evidence.
 *
 * Safety rules:
 * - only existing skills or operator-declared learnable skills may advance;
 * - one task can never create an arbitrary new capability;
 * - skill names in the operator objective alone do not earn evidence;
 * - retries are idempotent by task reference;
 * - certification requires at least three distinct evidence-backed tasks
 *   averaging 90% verifier score.
 */
export function applyVerifiedSkillLearning(args: {
  registry: AgentSkillsRegistry;
  signal: VerifiedSkillLearningSignal;
}): VerifiedSkillLearningResult {
  const normalised = normaliseAgentSkillsRegistry(args.registry) ?? {
    version: 1 as const,
    skills: [],
  };
  const score = clamp(Number(args.signal.verificationScore) || 0);
  if (!clean(args.signal.taskId, 120) || score < 0.75) {
    return {
      registry: normalised,
      changed: false,
      matched_skills: [],
      promoted_skills: [],
      certifications_awarded: [],
    };
  }

  // Capability credit comes from verified execution artifacts, not merely from
  // a skill name appearing in the operator's objective.
  const evidenceText = [
    args.signal.verifiedOutcome ?? "",
    ...(args.signal.evidence ?? []),
    ...(args.signal.completedSteps ?? []),
  ].join(" ");

  const matched: string[] = [];
  const promoted: string[] = [];
  const awarded: string[] = [];
  let changed = false;
  let registryCertifications = [...(normalised.certifications ?? [])];

  const skills = normalised.skills.map((original) => {
    if (!capabilityMatches(evidenceText, original.name, original.aliases ?? [])) return original;
    matched.push(original.name);
    const advanced = addVerifiedEvidence(original, args.signal);
    let skill = advanced.skill;
    changed = changed || advanced.changed;
    const certification = maybeCertification(skill);
    if (certification) {
      const currentSkillCerts = skill.certifications ?? [];
      const nextSkillCerts = upsertCertification(currentSkillCerts, certification);
      const nextRegistryCerts = upsertCertification(registryCertifications, certification);
      if (nextSkillCerts !== currentSkillCerts || nextRegistryCerts !== registryCertifications) {
        changed = true;
        if (!awarded.includes(certification.name)) awarded.push(certification.name);
      }
      skill = { ...skill, certifications: nextSkillCerts };
      registryCertifications = nextRegistryCerts;
    }
    return skill;
  });

  const known = new Set(skills.map((skill) => key(skill.name)));
  const remainingLearnable: string[] = [];
  for (const name of normalised.learnable_skills ?? []) {
    if (known.has(key(name))) continue;
    const shouldPromote = score >= 0.85 && capabilityMatches(evidenceText, name);
    if (!shouldPromote) {
      remainingLearnable.push(name);
      continue;
    }
    const promotedSkill: AgentSkillRecord = {
      name,
      proficiency: clamp(0.55 + Math.max(0, score - 0.85) * 0.2),
      learnable: true,
      evidence: [{
        kind: "verified_task",
        label: "Verifier-approved task completion",
        reference: `task:${clean(args.signal.taskId, 120)}`,
        verified: true,
        score,
      }],
    };
    skills.push(promotedSkill);
    known.add(key(name));
    matched.push(name);
    promoted.push(name);
    changed = true;
  }

  const registry = normaliseAgentSkillsRegistry({
    ...normalised,
    skills,
    certifications: registryCertifications,
    learnable_skills: remainingLearnable,
  }) ?? normalised;

  return {
    registry,
    changed,
    matched_skills: [...new Set(matched)],
    promoted_skills: promoted,
    certifications_awarded: awarded,
  };
}
