export type SkillScanSeverity = "warning" | "dangerous";
export type SkillScanFinding = {
  file: string;
  rule: string;
  severity: SkillScanSeverity;
  message: string;
};
export type SkillScanResult = {
  verdict: "ok" | "warning" | "dangerous";
  findings: SkillScanFinding[];
};

export type ScannableSkillFile = { path: string; content: string };

const MAX_FILES = 128;
const MAX_FILE_BYTES = 256_000;
const MAX_TOTAL_BYTES = 1_000_000;
const SCANNABLE_EXTENSIONS = new Set([".md", ".sh", ".bash", ".js", ".mjs", ".cjs", ".ts"]);

const RULES: Array<{
  rule: string;
  severity: SkillScanSeverity;
  message: string;
  pattern: RegExp;
}> = [
  {
    rule: "remote-pipe-shell",
    severity: "dangerous",
    message: "Downloads remote content and pipes it directly into a shell.",
    pattern: /(?:curl|wget)[^\n|]{0,300}\|\s*(?:ba)?sh\b/i,
  },
  {
    rule: "destructive-delete",
    severity: "dangerous",
    message: "Contains a broad destructive delete command.",
    pattern: /\brm\s+-[^\n]*r[^\n]*f[^\n]*(?:\/|~|\$HOME|\*)/i,
  },
  {
    rule: "credential-exfiltration",
    severity: "dangerous",
    message: "Appears to combine credential material with outbound transfer.",
    pattern: /(?:API[_-]?KEY|TOKEN|PASSWORD|SECRET|\.env|credentials)[\s\S]{0,400}(?:curl|wget|fetch\s*\(|axios|https?:\/\/)/i,
  },
  {
    rule: "shell-eval",
    severity: "dangerous",
    message: "Executes dynamically constructed shell/code content.",
    pattern: /\b(?:eval|exec)\s*(?:\(|\s)/i,
  },
  {
    rule: "privilege-escalation",
    severity: "dangerous",
    message: "Requests privileged/root execution.",
    pattern: /\b(?:sudo|su\s+-c|chmod\s+[0-7]*[467][0-7]{2})\b/i,
  },
  {
    rule: "shell-download",
    severity: "warning",
    message: "Downloads remote content from a script; review the destination and integrity checks.",
    pattern: /\b(?:curl|wget)\b/i,
  },
  {
    rule: "process-spawn",
    severity: "warning",
    message: "Spawns a child process or shell.",
    pattern: /\b(?:child_process|spawnSync|execFile|execSync)\b/i,
  },
  {
    rule: "environment-access",
    severity: "warning",
    message: "Reads process environment variables that may contain secrets.",
    pattern: /\bprocess\.env\b|\$\{?[A-Z][A-Z0-9_]{2,}\}?/,
  },
];

function ext(path: string): string {
  const dot = path.lastIndexOf(".");
  return dot >= 0 ? path.slice(dot).toLowerCase() : "";
}

function safePath(path: string): boolean {
  if (!path || path.startsWith("/") || path.includes("\\")) return false;
  const parts = path.split("/");
  return !parts.some((part) => part === "" || part === "." || part === "..");
}

export function scanAgentSkillFiles(files: readonly ScannableSkillFile[]): SkillScanResult {
  if (files.length === 0) return { verdict: "dangerous", findings: [{ file: "", rule: "empty-skill", severity: "dangerous", message: "Skill contains no files." }] };
  if (files.length > MAX_FILES) throw new Error(`Skill contains more than ${MAX_FILES} files.`);
  let totalBytes = 0;
  const findings: SkillScanFinding[] = [];
  let hasManifest = false;

  for (const file of files) {
    if (!safePath(file.path)) {
      findings.push({ file: file.path, rule: "unsafe-path", severity: "dangerous", message: "Skill file path escapes or bypasses the skill root." });
      continue;
    }
    if (file.path === "SKILL.md") hasManifest = true;
    const bytes = Buffer.byteLength(file.content, "utf8");
    totalBytes += bytes;
    if (bytes > MAX_FILE_BYTES) {
      findings.push({ file: file.path, rule: "oversized-file", severity: "dangerous", message: `Skill file exceeds ${MAX_FILE_BYTES} bytes.` });
      continue;
    }
    if (!SCANNABLE_EXTENSIONS.has(ext(file.path))) continue;
    for (const rule of RULES) {
      if (rule.pattern.test(file.content)) findings.push({ file: file.path, rule: rule.rule, severity: rule.severity, message: rule.message });
    }
  }

  if (totalBytes > MAX_TOTAL_BYTES) throw new Error(`Skill source exceeds ${MAX_TOTAL_BYTES} bytes.`);
  if (!hasManifest) findings.push({ file: "SKILL.md", rule: "missing-manifest", severity: "dangerous", message: "Skill is missing the required SKILL.md manifest." });

  const unique = findings.filter((finding, index, all) => all.findIndex((other) => other.file === finding.file && other.rule === finding.rule) === index);
  const verdict = unique.some((f) => f.severity === "dangerous") ? "dangerous" : unique.length ? "warning" : "ok";
  return { verdict, findings: unique };
}

export function assertSkillScriptAllowlisted(script: string, requiresScripts: readonly string[]): string {
  const normalized = script.trim();
  if (!normalized || normalized.includes("/") || normalized.includes("\\") || normalized === "." || normalized === "..") {
    throw new Error("Skill script must be a direct file name from the manifest allowlist.");
  }
  if (!requiresScripts.includes(normalized)) throw new Error(`Skill script "${normalized}" is not declared in requires_scripts.`);
  return normalized;
}
