export type AgentSkillManifest = {
  name: string;
  description: string;
  version: string;
  requiresTools: string[];
  requiresScripts: string[];
  dangerous: boolean;
};

export type ParsedAgentSkill = {
  manifest: AgentSkillManifest;
  body: string;
};

const NAME_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const MAX_DESCRIPTION = 240;
const MAX_LIST_ITEMS = 64;
const MAX_ITEM_LENGTH = 160;

function parseScalar(value: string): string | boolean | string[] {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((item) => item.trim().replace(/^['"]|['"]$/g, ""));
  }
  return trimmed.replace(/^['"]|['"]$/g, "");
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Skill ${field} must be a non-empty string.`);
  return value.trim();
}

function asStringList(value: unknown, field: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`Skill ${field} must be a string list.`);
  if (value.length > MAX_LIST_ITEMS) throw new Error(`Skill ${field} has too many entries.`);
  return value.map((item) => {
    if (typeof item !== "string" || !item.trim()) throw new Error(`Skill ${field} entries must be non-empty strings.`);
    const normalized = item.trim();
    if (normalized.length > MAX_ITEM_LENGTH) throw new Error(`Skill ${field} entry is too long.`);
    return normalized;
  });
}

function parseFrontmatter(raw: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const lines = raw.split(/\r?\n/);
  let activeList: string | null = null;
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const listMatch = /^\s*-\s+(.+)$/.exec(line);
    if (listMatch && activeList) {
      const current = out[activeList];
      if (!Array.isArray(current)) throw new Error(`Skill ${activeList} must be a list.`);
      current.push(listMatch[1]!.trim().replace(/^['"]|['"]$/g, ""));
      continue;
    }
    const fieldMatch = /^([A-Za-z0-9_]+):(?:\s*(.*))?$/.exec(line);
    if (!fieldMatch) throw new Error("Invalid SKILL.md frontmatter syntax.");
    const key = fieldMatch[1]!;
    const value = fieldMatch[2] ?? "";
    if (!value.trim()) {
      out[key] = [];
      activeList = key;
    } else {
      out[key] = parseScalar(value);
      activeList = null;
    }
  }
  return out;
}

export function parseAgentSkillMarkdown(markdown: string): ParsedAgentSkill {
  if (typeof markdown !== "string") throw new Error("SKILL.md must be text.");
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/.exec(markdown);
  if (!match) throw new Error("SKILL.md must start with YAML-style frontmatter.");
  const raw = parseFrontmatter(match[1]!);
  const name = asString(raw["name"], "name");
  if (!NAME_RE.test(name)) throw new Error("Skill name must be lowercase kebab-case and 1-63 characters.");
  const description = asString(raw["description"], "description");
  if (description.length > MAX_DESCRIPTION) throw new Error(`Skill description must be ${MAX_DESCRIPTION} characters or fewer.`);
  const version = asString(raw["version"], "version");
  const dangerousValue = raw["dangerous"];
  const dangerous = dangerousValue === undefined ? false : dangerousValue;
  if (typeof dangerous !== "boolean") throw new Error("Skill dangerous must be a boolean.");
  const requiresTools = asStringList(raw["requires_tools"], "requires_tools");
  const requiresScripts = asStringList(raw["requires_scripts"], "requires_scripts");
  for (const script of requiresScripts) {
    if (script.includes("/") || script.includes("\\") || script === "." || script === "..") {
      throw new Error("Skill script allowlist entries must be file names, not paths.");
    }
  }
  const body = match[2]!.trim();
  if (!body) throw new Error("SKILL.md must contain a playbook body.");
  return { manifest: { name, description, version, requiresTools, requiresScripts, dangerous }, body };
}
