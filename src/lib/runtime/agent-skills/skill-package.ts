import { parseAgentSkillMarkdown } from "./skill-manifest";
import { scanAgentSkillFiles, type ScannableSkillFile, type SkillScanResult } from "./skill-security-scanner";

export type PreparedAgentSkillPackage = {
  name: string;
  description: string;
  version: string;
  body: string;
  requiresTools: string[];
  requiresScripts: string[];
  providesCapabilities: string[];
  requiresProviders: string[];
  dangerous: boolean;
  scan: SkillScanResult;
  files: Record<string, string>;
};

const MAX_FILES = 128;

function normalizeFiles(files: readonly ScannableSkillFile[]): ScannableSkillFile[] {
  if (files.length === 0) throw new Error("Skill package contains no files.");
  if (files.length > MAX_FILES) throw new Error(`Skill package contains more than ${MAX_FILES} files.`);
  const seen = new Set<string>();
  return files.map((file) => {
    const path = file.path.trim();
    if (!path) throw new Error("Skill package contains an empty file path.");
    if (seen.has(path)) throw new Error(`Skill package contains duplicate file "${path}".`);
    seen.add(path);
    return { path, content: file.content };
  });
}

export function prepareAgentSkillPackage(
  files: readonly ScannableSkillFile[],
  options: { acknowledgeRisk?: boolean } = {},
): PreparedAgentSkillPackage {
  const normalized = normalizeFiles(files);
  const manifestFile = normalized.find((file) => file.path === "SKILL.md");
  if (!manifestFile) throw new Error("Skill package requires SKILL.md at the package root.");

  const parsed = parseAgentSkillMarkdown(manifestFile.content);
  const scan = scanAgentSkillFiles(normalized);
  if (scan.verdict === "dangerous" && !options.acknowledgeRisk) {
    throw new Error("Skill install blocked by dangerous security findings. Explicit risk acknowledgement is required.");
  }

  const fileMap = Object.fromEntries(normalized.map((file) => [file.path, file.content]));
  for (const script of parsed.manifest.requiresScripts) {
    if (!Object.prototype.hasOwnProperty.call(fileMap, `scripts/${script}`)) {
      throw new Error(`Skill declares script "${script}" but scripts/${script} is missing.`);
    }
  }

  return {
    name: parsed.manifest.name,
    description: parsed.manifest.description,
    version: parsed.manifest.version,
    body: parsed.body,
    requiresTools: parsed.manifest.requiresTools,
    requiresScripts: parsed.manifest.requiresScripts,
    providesCapabilities: parsed.manifest.providesCapabilities,
    requiresProviders: parsed.manifest.requiresProviders,
    dangerous: parsed.manifest.dangerous || scan.verdict === "dangerous",
    scan,
    files: fileMap,
  };
}
