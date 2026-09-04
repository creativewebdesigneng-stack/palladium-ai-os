import type { PreparedAgentSkillPackage } from "./skill-package";

export type CapabilityCompilerInventory = {
  tools: readonly string[];
  providers: readonly string[];
};

export type CompiledAgentCapability = {
  id: string;
  source: "agent-skill";
  skillName: string;
  skillVersion: string;
  capabilities: string[];
  toolScopes: string[];
  providerScopes: string[];
  scriptAllowlist: string[];
  requiresApproval: boolean;
  executable: boolean;
  blockers: string[];
};

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function missing(required: readonly string[], available: ReadonlySet<string>) {
  return uniqueSorted(required).filter((item) => !available.has(item) && !available.has("*"));
}

/**
 * Compiles an installed skill package into a deterministic runtime capability contract.
 * It does not generate or execute code: execution remains behind the existing Skills,
 * approval and Agent Runtime boundaries.
 */
export function compileAgentSkillCapability(
  skill: PreparedAgentSkillPackage,
  inventory: CapabilityCompilerInventory,
): CompiledAgentCapability {
  const tools = uniqueSorted(skill.requiresTools);
  const providers = uniqueSorted(skill.requiresProviders);
  const capabilities = uniqueSorted(
    skill.providesCapabilities.length ? skill.providesCapabilities : [`skill.${skill.name}`],
  );
  const scripts = uniqueSorted(skill.requiresScripts);

  const missingTools = missing(tools, new Set(inventory.tools));
  const missingProviders = missing(providers, new Set(inventory.providers));
  const blockers = [
    ...missingTools.map((tool) => `missing-tool:${tool}`),
    ...missingProviders.map((provider) => `missing-provider:${provider}`),
  ];

  return {
    id: `skill:${skill.name}@${skill.version}`,
    source: "agent-skill",
    skillName: skill.name,
    skillVersion: skill.version,
    capabilities,
    toolScopes: tools,
    providerScopes: providers,
    scriptAllowlist: scripts,
    requiresApproval: skill.dangerous || scripts.length > 0,
    executable: blockers.length === 0,
    blockers,
  };
}

export function compileAgentSkillCapabilities(
  skills: readonly PreparedAgentSkillPackage[],
  inventory: CapabilityCompilerInventory,
): CompiledAgentCapability[] {
  const seen = new Set<string>();
  return skills.map((skill) => {
    const compiled = compileAgentSkillCapability(skill, inventory);
    if (seen.has(compiled.id)) throw new Error(`Duplicate compiled capability source: ${compiled.id}`);
    seen.add(compiled.id);
    return compiled;
  });
}
