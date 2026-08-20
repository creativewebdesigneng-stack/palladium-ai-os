import { Sandbox } from "e2b";

const OUTPUT_LIMIT = 20_000;
const SANDBOX_TIMEOUT_MS = 60_000;
const COMMAND_TIMEOUT_MS = 15_000;
const ROOT = "/home/user";

const EXACT = new Set([
  "pwd",
  "whoami",
  "id",
  "date",
  "uptime",
]);

const VERSION_COMMANDS = new Set([
  "git --version",
  "node --version",
  "node -v",
  "npm --version",
  "npm -v",
  "python --version",
  "python -V",
  "python3 --version",
  "python3 -V",
  "bun --version",
  "bun -v",
]);

function bounded(value: unknown) {
  return typeof value === "string" ? value.slice(-OUTPUT_LIMIT) : "";
}

function safePathToken(token: string) {
  if (!token || token.includes("..") || token.includes("\\") || token.startsWith("~")) return false;
  if (token.startsWith("/") && !token.startsWith(ROOT)) return false;
  return /^[A-Za-z0-9_./-]+$/.test(token);
}

/**
 * Deliberately conservative command policy. This is a diagnostic shell, not an
 * arbitrary-code runner. Network clients, interpreters with inline code,
 * redirects, pipes, substitutions and command chaining are rejected before an
 * isolated E2B sandbox is created.
 */
export function validateTerminalCommand(raw: string) {
  const command = raw.trim().replace(/\s+/g, " ");
  if (!command) throw new Error("Enter a command.");
  if (command.length > 240) throw new Error("Command is too long.");
  if (/[;&|><`$(){}\[\]\n\r]/.test(command)) {
    throw new Error("Shell operators, redirects and substitutions are not allowed in the diagnostic terminal.");
  }
  if (EXACT.has(command) || VERSION_COMMANDS.has(command)) return command;

  const parts = command.split(" ");
  const [program, ...args] = parts;

  if (program === "uname") {
    if (args.length === 0 || (args.length === 1 && ["-a", "-s", "-r", "-m"].includes(args[0]!))) return command;
  }
  if (program === "df") {
    if (args.length === 0 || (args.length === 1 && args[0] === "-h")) return command;
  }
  if (program === "free") {
    if (args.length === 0 || (args.length === 1 && ["-h", "-m"].includes(args[0]!))) return command;
  }
  if (program === "ps") {
    if (args.length === 0 || (args.length === 1 && ["aux", "-ef"].includes(args[0]!))) return command;
  }
  if (program === "ls") {
    if (args.length <= 4 && args.every((arg) => /^-[A-Za-z]+$/.test(arg) || safePathToken(arg))) return command;
  }

  throw new Error(
    "Command is not allowed. Use diagnostic commands such as pwd, ls, whoami, id, date, uname, uptime, df, free, ps, or runtime --version checks.",
  );
}

export type TerminalExecutionResult = {
  provider: "e2b";
  sandboxId: string;
  command: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
};

export function terminalConfigured() {
  return Boolean(process.env["E2B_API_KEY"]?.trim());
}

export async function executeTerminalCommand(raw: string): Promise<TerminalExecutionResult> {
  if (!terminalConfigured()) throw new Error("E2B sandbox is not configured.");
  const command = validateTerminalCommand(raw);
  const started = Date.now();
  const sandbox = await Sandbox.create({
    timeoutMs: SANDBOX_TIMEOUT_MS,
    secure: true,
    metadata: { product: "palladium-terminal", mode: "diagnostic" },
  });

  try {
    const result = await sandbox.commands.run(command, {
      cwd: ROOT,
      envs: { CI: "1", PALLADIUM_TERMINAL: "diagnostic" },
      timeoutMs: COMMAND_TIMEOUT_MS,
    });
    return {
      provider: "e2b",
      sandboxId: sandbox.sandboxId,
      command,
      exitCode: typeof result.exitCode === "number" ? result.exitCode : 0,
      stdout: bounded(result.stdout),
      stderr: bounded(result.stderr),
      durationMs: Date.now() - started,
    };
  } catch (error: any) {
    return {
      provider: "e2b",
      sandboxId: sandbox.sandboxId,
      command,
      exitCode: typeof error?.exitCode === "number" ? error.exitCode : null,
      stdout: bounded(error?.stdout),
      stderr: bounded(error?.stderr ?? error?.message ?? "Command failed."),
      durationMs: Date.now() - started,
    };
  } finally {
    await sandbox.kill().catch((error) => console.warn("[terminal] could not kill E2B sandbox", error));
  }
}
