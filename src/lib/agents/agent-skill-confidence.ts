import {
  normaliseAgentSkillsRegistry,
  type AgentSkillCertification,
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
  certifications_expired: string[];
};

export type AgentSkillGap = {
  skill: string;
  kind: "revalidate" | "build_evidence" | "develop" | "learnable";
  priority: number;
  reason: string;
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

function certificationName(skillName: string) {
  return `Blackstar Verified — ${skillName}`;
}

function shouldExpireCertification(skill: AgentSkillRecord) {
  const recent = (skill.evidence ?? [])
    .filter((item) =>
      item.verified &&
      (item.kind === "verified_task" || item.kind === "verified_failure") &&
      typeof item.reference === "string" &&
      item.reference.length > 0,
    )
    .slice(-3);
  return recent.length === 3 && recent.every((item) => item.kind === "verified_failure");
}

function expireBlackstarCertification(
  certifications: AgentSkillCertification[],
  skillName: string,
) {
  const targetName = certificationName(skillName);
  let changed = false;
  const next = certifications.map((item) => {
    const isTarget =
      key(item.name) === key(targetName) &&
      key(item.issuer ?? "") === key("Blackstar runtime verifier");
    if (!isTarget || item.status !== "verified") return item;
    changed = true;
    return { ...item, status: "expired" as const };
  });
  return { certifications: next, changed, name: changed ? targetName : null };
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
      certifications_expired: [],
    };
  }

  const matched: string[] = [];
  const reduced: string[] = [];
  const expired: string[] = [];
  let changed = false;
  let registryCertifications = [...(normalised.certifications ?? [])];

  const skills = normalised.skills.map((skill) => {
    if (!capabilityMatches(supportText, skill.name, skill.aliases ?? [])) return skill;
    matched.push(skill.name);
    const next = addFailureEvidence(skill, args.signal);
    changed = changed || next.changed;
    if (next.reduced) reduced.push(skill.name);

    let nextSkill = next.skill;
    if (shouldExpireCertification(nextSkill)) {
      const skillExpiration = expireBlackstarCertification(nextSkill.certifications ?? [], skill.name);
      const registryExpiration = expireBlackstarCertification(registryCertifications, skill.name);
      if (skillExpiration.changed || registryExpiration.changed) {
        changed = true;
        if (!expired.includes(certificationName(skill.name))) expired.push(certificationName(skill.name));
      }
      nextSkill = { ...nextSkill, certifications: skillExpiration.certifications };
      registryCertifications = registryExpiration.certifications;
    }
    return nextSkill;
  });

  const registry = normaliseAgentSkillsRegistry({
    ...normalised,
    skills,
    certifications: registryCertifications,
  }) ?? normalised;

  return {
    registry,
    changed,
    matched_skills: [...new Set(matched)],
    reduced_skills: [...new Set(reduced)],
    certifications_expired: [...new Set(expired)],
  };
}

/**
 * Builds an operator-facing development plan from the same verified success /
 * failure evidence used by skill confidence. This is advisory only: it never
 * changes capabilities, permissions, approvals or delegation rights.
 */
export function buildAgentSkillGapPlan(
  registry: AgentSkillsRegistry | null | undefined,
  limit = 6,
): AgentSkillGap[] {
  if (!registry) return [];
  const gaps: AgentSkillGap[] = [];

  for (const skill of registry.skills) {
    const failures = failureEvidence(skill).length;
    const successes = (skill.evidence ?? []).filter((item) =>
      item.kind === "verified_task" &&
      item.verified &&
      typeof item.reference === "string" &&
      item.reference.length > 0,
    ).length;
    const certified = (skill.certifications ?? []).some((item) => item.status === "verified");
    const expiredBlackstarCertification = [
      ...(skill.certifications ?? []),
      ...(registry.certifications ?? []),
    ].some((item) =>
      item.status === "expired" &&
      key(item.issuer ?? "") === key("Blackstar runtime verifier") &&
      key(item.name) === key(certificationName(skill.name)),
    );

    if (expiredBlackstarCertification) {
      gaps.push({
        skill: skill.name,
        kind: "revalidate",
        priority: 130 + Math.min(failures, 10) * 2,
        reason: "Blackstar verification expired after recent verifier-confirmed failures; earn fresh successful evidence to re-certify.",
      });
      continue;
    }

    if (failures >= 2 && failures >= successes) {
      gaps.push({
        skill: skill.name,
        kind: "revalidate",
        priority: 100 + failures * 5,
        reason: `${failures} verifier-confirmed failures need fresh successful evidence.`,
      });
      continue;
    }
    if (successes === 0) {
      gaps.push({
        skill: skill.name,
        kind: "build_evidence",
        priority: 80 + Math.round((1 - skill.proficiency) * 10),
        reason: "Declared capability has no verified task evidence yet.",
      });
      continue;
    }
    if (skill.proficiency < 0.7 && !certified) {
      gaps.push({
        skill: skill.name,
        kind: "develop",
        priority: 60 + Math.round((0.7 - skill.proficiency) * 100),
        reason: `Verified proficiency is ${Math.round(skill.proficiency * 100)}%; more successful evidence can strengthen it.`,
      });
    }
  }

  const known = new Set(registry.skills.map((skill) => key(skill.name)));
  for (const skill of registry.learnable_skills ?? []) {
    if (known.has(key(skill))) continue;
    gaps.push({
      skill,
      kind: "learnable",
      priority: 50,
      reason: "Operator marked this capability as available to learn.",
    });
  }

  return gaps
    .sort((a, b) => b.priority - a.priority || a.skill.localeCompare(b.skill))
    .slice(0, Math.min(Math.max(limit, 1), 12));
}

