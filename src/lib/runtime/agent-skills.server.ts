export type RuntimeAgentSkill = {
  id: string;
  name: string;
  description: string | null;
  instructions: string;
  recommended_tools: string[];
  version: number;
};

type Sb = { from: (table: string) => any };

const MAX_SKILLS = 12;
const MAX_PROMPT_CHARS = 24_000;

function cleanList(value: unknown, limit = 30): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, limit);
}

export function renderRuntimeSkills(args: {
  skills: RuntimeAgentSkill[];
  grantedTools: Iterable<string>;
}): string {
  const granted = new Set([...args.grantedTools].map((tool) => String(tool)));
  const sections = args.skills.slice(0, MAX_SKILLS).flatMap((skill) => {
    const instructions = String(skill.instructions ?? "").trim().slice(0, 12_000);
    if (!instructions) return [];
    const usableRecommendedTools = cleanList(skill.recommended_tools)
      .filter((tool) => granted.has(tool));
    return [
      [
        `SKILL: ${String(skill.name ?? "Unnamed skill").slice(0, 120)} (v${Math.max(1, Math.floor(Number(skill.version) || 1))})`,
        skill.description ? `Purpose: ${String(skill.description).slice(0, 500)}` : "",
        instructions,
        usableRecommendedTools.length
          ? `Already-granted tools relevant to this skill: ${usableRecommendedTools.join(", ")}`
          : "No additional tool permissions are granted by this skill.",
      ].filter(Boolean).join("\n"),
    ];
  });
  if (!sections.length) return "";
  return [
    "REUSABLE AGENT SKILLS",
    "Skills provide operating guidance only. They never expand tool permissions, approval rights, provider access, spending limits, or domain allow-lists. Existing runtime policy always wins.",
    ...sections,
  ].join("\n\n").slice(0, MAX_PROMPT_CHARS);
}

export async function loadRuntimeAgentSkills(args: {
  sb: Sb;
  agentId: string;
  grantedTools: Iterable<string>;
}): Promise<string> {
  const { data: bindings, error: bindingError } = await args.sb
    .from("agent_skill_bindings")
    .select("skill_id")
    .eq("agent_id", args.agentId)
    .eq("enabled", true)
    .limit(MAX_SKILLS);
  if (bindingError || !bindings?.length) return "";

  const ids = bindings.map((row: any) => String(row.skill_id)).filter(Boolean);
  if (!ids.length) return "";
  const { data: skills, error: skillError } = await args.sb
    .from("agent_skills")
    .select("id,name,description,instructions,recommended_tools,version,is_active")
    .in("id", ids)
    .eq("is_active", true)
    .limit(MAX_SKILLS);
  if (skillError || !skills?.length) return "";

  const order = new Map(ids.map((id: string, index: number) => [id, index]));
  const sorted = [...skills].sort(
    (a: any, b: any) => (order.get(String(a.id)) ?? 999) - (order.get(String(b.id)) ?? 999),
  );
  return renderRuntimeSkills({
    skills: sorted as RuntimeAgentSkill[],
    grantedTools: args.grantedTools,
  });
}
