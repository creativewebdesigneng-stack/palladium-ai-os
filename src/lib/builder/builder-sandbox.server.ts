import { Sandbox } from "e2b";

type ManifestFile = { path: string; content: string };
type StageName = "install" | "build" | "typecheck" | "test";

export type BuilderSandboxStage = {
  name: StageName;
  status: "passed" | "failed" | "skipped";
  command?: string;
  exitCode?: number | null;
  stdout?: string;
  stderr?: string;
  reason?: string;
};

export type BuilderSandboxResult = {
  provider: "e2b";
  sandboxId: string;
  passed: boolean;
  stages: BuilderSandboxStage[];
};

const ROOT = "/home/user/app";
const LOG_LIMIT = 20_000;
const SANDBOX_TIMEOUT_MS = 10 * 60_000;
const COMMAND_TIMEOUT_MS = 4 * 60_000;

function bounded(value: unknown) {
  return typeof value === "string" ? value.slice(-LOG_LIMIT) : "";
}

function manifestFiles(manifest: unknown): ManifestFile[] {
  const files = (manifest as { files?: unknown })?.files;
  if (!Array.isArray(files) || !files.length) throw new Error("The persisted Builder source manifest is invalid.");
  return files.map((file: any) => {
    const path = String(file?.path ?? "").trim();
    const content = String(file?.content ?? "");
    if (!path || path.startsWith("/") || path.includes("\\") || path.split("/").some((part) => !part || part === "." || part === "..")) {
      throw new Error("The Builder source manifest contains an unsafe file path.");
    }
    return { path, content };
  });
}

function scriptsFrom(files: ManifestFile[]) {
  const packageFile = files.find((file) => file.path === "package.json");
  if (!packageFile) throw new Error("Sandbox validation requires a generated package.json.");
  let parsed: any;
  try { parsed = JSON.parse(packageFile.content); } catch { throw new Error("Generated package.json is not valid JSON."); }
  const scripts = parsed?.scripts && typeof parsed.scripts === "object" ? parsed.scripts as Record<string, unknown> : {};
  return {
    build: typeof scripts.build === "string" && scripts.build.trim() ? "npm run build" : null,
    typecheck: typeof scripts.typecheck === "string" && scripts.typecheck.trim() ? "npm run typecheck" : null,
    test: typeof scripts.test === "string" && scripts.test.trim() ? "npm test -- --run" : null,
  };
}

async function runStage(sandbox: Sandbox, name: StageName, command: string): Promise<BuilderSandboxStage> {
  try {
    const result = await sandbox.commands.run(command, {
      cwd: ROOT,
      envs: { CI: "1", NODE_ENV: "production" },
      timeoutMs: COMMAND_TIMEOUT_MS,
    });
    return {
      name,
      status: "passed",
      command,
      exitCode: typeof result.exitCode === "number" ? result.exitCode : 0,
      stdout: bounded(result.stdout),
      stderr: bounded(result.stderr),
    };
  } catch (error: any) {
    return {
      name,
      status: "failed",
      command,
      exitCode: typeof error?.exitCode === "number" ? error.exitCode : null,
      stdout: bounded(error?.stdout),
      stderr: bounded(error?.stderr ?? error?.message),
    };
  }
}

export async function runBuilderSandboxValidation(args: { builderJobId: string; sourceManifest: unknown }): Promise<BuilderSandboxResult> {
  if (!process.env["E2B_API_KEY"]?.trim()) throw new Error("E2B sandbox is not configured.");
  const files = manifestFiles(args.sourceManifest);
  const scripts = scriptsFrom(files);
  const sandbox = await Sandbox.create({
    timeoutMs: SANDBOX_TIMEOUT_MS,
    secure: true,
    metadata: { builder_job_id: args.builderJobId, product: "palladium-builder" },
  });
  const stages: BuilderSandboxStage[] = [];

  try {
    await sandbox.commands.run(`mkdir -p ${ROOT}`);
    await sandbox.files.write(files.map((file) => ({ path: `${ROOT}/${file.path}`, data: file.content })));

    const hasPackageLock = files.some((file) => file.path === "package-lock.json");
    const install = await runStage(sandbox, "install", hasPackageLock ? "npm ci --ignore-scripts" : "npm install --ignore-scripts");
    stages.push(install);
    if (install.status === "failed") return { provider: "e2b", sandboxId: sandbox.sandboxId, passed: false, stages };

    for (const [name, command] of Object.entries(scripts) as Array<[Exclude<StageName, "install">, string | null]>) {
      if (!command) {
        stages.push({ name, status: "skipped", reason: `package.json has no ${name} script.` });
        continue;
      }
      const stage = await runStage(sandbox, name, command);
      stages.push(stage);
      if (stage.status === "failed") return { provider: "e2b", sandboxId: sandbox.sandboxId, passed: false, stages };
    }

    return { provider: "e2b", sandboxId: sandbox.sandboxId, passed: true, stages };
  } finally {
    await sandbox.kill().catch((error) => console.warn("[builder:sandbox] could not kill E2B sandbox", error));
  }
}
