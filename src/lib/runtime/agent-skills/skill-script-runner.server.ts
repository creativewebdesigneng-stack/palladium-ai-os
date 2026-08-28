type Sb = { from: (table: string) => any };

export type SkillScriptStep = {
  tool: string;
  input: Record<string, unknown>;
};

export type SkillScriptRecipe = {
  version: 1;
  steps: SkillScriptStep[];
};

export type SkillScriptExecutor = (tool: string, input: Record<string, unknown>) => Promise<{
  ok: boolean;
  output: unknown;
}>;

const SCRIPT_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}\.json$/;
const TOOL_SLUG = /^[a-z][a-z0-9_-]{0,79}$/;
const PARAM_KEY = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const MAX_SCRIPT_BYTES = 48_000;
const MAX_STEPS = 12;
const MAX_PARAMS = 24;
const MAX_STRING_PARAM = 4_000;
const MAX_MODEL_OUTPUT = 12_000;
const SENSITIVE_KEY = /(token|secret|password|passwd|api[_-]?key|authorization|cookie|card|cvv|iban|ssn)/i;
const PLACEHOLDER = /^\{\{([A-Za-z][A-Za-z0-9_]{0,63})\}\}$/;

type SkillRow = {
  id: string;
  user_id: string;
  name: string;
  version: string;
  enabled: boolean;
  dangerous: boolean;
  scan_verdict: string;
  requires_tools: string[] | null;
  requires_scripts: string[] | null;
  files: Record<string, unknown> | null;
};

function cleanScriptName(value: unknown): string {
  if (typeof value !== "string" || !SCRIPT_NAME.test(value)) {
    throw new Error("Skill scripts must be declared JSON recipe names.");
  }
  return value;
}

export function normalizeSkillScriptParams(raw: Record<string, unknown> | undefined): Record<string, string | number | boolean | null> {
  const entries = Object.entries(raw ?? {});
  if (entries.length > MAX_PARAMS) throw new Error(`Skill script accepts at most ${MAX_PARAMS} parameters.`);
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of entries) {
    if (!PARAM_KEY.test(key)) throw new Error(`Skill script parameter "${key}" is invalid.`);
    if (SENSITIVE_KEY.test(key)) throw new Error(`Sensitive parameter "${key}" is not accepted by skill scripts.`);
    if (value === null || typeof value === "boolean" || typeof value === "number") {
      if (typeof value === "number" && !Number.isFinite(value)) throw new Error(`Parameter "${key}" must be finite.`);
      out[key] = value;
      continue;
    }
    if (typeof value !== "string") throw new Error(`Parameter "${key}" must be a scalar value.`);
    if (value.length > MAX_STRING_PARAM) throw new Error(`Parameter "${key}" is too large.`);
    out[key] = value;
  }
  return out;
}

function materialize(value: unknown, params: Record<string, string | number | boolean | null>): unknown {
  if (typeof value === "string") {
    const match = PLACEHOLDER.exec(value);
    if (!match) return value.slice(0, 8_000);
    const key = match[1]!;
    if (!Object.prototype.hasOwnProperty.call(params, key)) throw new Error(`Missing skill script parameter "${key}".`);
    return params[key];
  }
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => materialize(item, params));
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > 50) throw new Error("Skill script step input has too many fields.");
    return Object.fromEntries(entries.map(([key, item]) => {
      if (SENSITIVE_KEY.test(key)) throw new Error(`Skill script input field "${key}" is forbidden.`);
      return [key, materialize(item, params)];
    }));
  }
  return value;
}

export function parseSkillScriptRecipe(content: string, declaredTools: readonly string[]): SkillScriptRecipe {
  if (Buffer.byteLength(content, "utf8") > MAX_SCRIPT_BYTES) throw new Error("Skill script is too large.");
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new Error("Skill script must be valid JSON.");
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Skill script recipe must be an object.");
  const row = raw as Record<string, unknown>;
  if (row["version"] !== 1) throw new Error("Unsupported skill script recipe version.");
  if (!Array.isArray(row["steps"]) || row["steps"].length === 0 || row["steps"].length > MAX_STEPS) {
    throw new Error(`Skill script must contain between 1 and ${MAX_STEPS} steps.`);
  }
  const allowed = new Set(declaredTools);
  const steps = row["steps"].map((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Skill script step ${index + 1} is invalid.`);
    const step = value as Record<string, unknown>;
    const tool = typeof step["tool"] === "string" ? step["tool"] : "";
    if (!TOOL_SLUG.test(tool)) throw new Error(`Skill script step ${index + 1} has an invalid tool.`);
    if (tool === "skill_script") throw new Error("Skill scripts cannot recursively invoke skill_script.");
    if (!allowed.has(tool)) throw new Error(`Skill script tool "${tool}" is not declared by the skill manifest.`);
    const input = step["input"];
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error(`Skill script step ${index + 1} input must be an object.`);
    return { tool, input: input as Record<string, unknown> };
  });
  return { version: 1, steps };
}

export async function loadOwnedSkillScript(args: {
  sb: Sb;
  userId: string;
  skillId: string;
  script: string;
}): Promise<{ skill: SkillRow; recipe: SkillScriptRecipe; script: string }> {
  const script = cleanScriptName(args.script);
  const { data, error } = await args.sb
    .from("agent_skills")
    .select("id,user_id,name,version,enabled,dangerous,scan_verdict,requires_tools,requires_scripts,files")
    .eq("id", args.skillId)
    .eq("user_id", args.userId)
    .maybeSingle();
  if (error || !data) throw new Error("That skill is not available to you.");
  const skill = data as SkillRow;
  if (!skill.enabled) throw new Error("That skill is disabled.");
  if (skill.dangerous || skill.scan_verdict === "dangerous") throw new Error("Dangerous skills cannot execute scripts.");
  if (!(skill.requires_scripts ?? []).includes(script)) throw new Error(`Script "${script}" is not declared by this skill.`);
  const content = skill.files?.[`scripts/${script}`];
  if (typeof content !== "string") throw new Error(`Declared script "${script}" is missing from the installed package.`);
  const recipe = parseSkillScriptRecipe(content, skill.requires_tools ?? []);
  return { skill, recipe, script };
}

export async function runLoadedSkillScript(args: {
  recipe: SkillScriptRecipe;
  params?: Record<string, unknown>;
  execute: SkillScriptExecutor;
}) {
  const params = normalizeSkillScriptParams(args.params);
  const results: Array<{ tool: string; ok: boolean; output: unknown }> = [];
  for (const step of args.recipe.steps) {
    const input = materialize(step.input, params) as Record<string, unknown>;
    const result = await args.execute(step.tool, input);
    const text = JSON.stringify(result.output ?? null);
    const output = text.length > MAX_MODEL_OUTPUT ? { truncated: true, bytes: text.length } : result.output;
    results.push({ tool: step.tool, ok: result.ok, output });
    if (!result.ok) break;
  }
  return {
    ok: results.length === args.recipe.steps.length && results.every((result) => result.ok),
    steps_completed: results.length,
    results,
  };
}
