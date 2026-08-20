import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const functions = readFileSync(
  fileURLToPath(new URL("../terminal.functions.ts", import.meta.url)),
  "utf8",
);
const server = readFileSync(
  fileURLToPath(new URL("../terminal.server.ts", import.meta.url)),
  "utf8",
);
const screen = readFileSync(
  fileURLToPath(new URL("../../../screens/Terminal.jsx", import.meta.url)),
  "utf8",
);

describe("Terminal production contract", () => {
  it("requires authentication, entitlements, usage and audit logging", () => {
    expect(functions).toContain("requireSupabaseAuth");
    expect(functions).toContain('assertWithinLimit(entitlements, "tasks_per_month")');
    expect(functions).toContain('metric: "terminal_command"');
    expect(functions).toContain('action: "terminal.command"');
  });

  it("creates secure short-lived E2B sandboxes and always kills them", () => {
    expect(server).toContain('Sandbox.create({');
    expect(server).toContain("secure: true");
    expect(server).toContain("SANDBOX_TIMEOUT_MS = 60_000");
    expect(server).toContain("COMMAND_TIMEOUT_MS = 15_000");
    expect(server).toContain("await sandbox.kill()");
    expect(server).not.toContain("E2B_API_KEY: process.env");
  });

  it("states the real safety boundary in the UI", () => {
    expect(screen).toContain("No command runs on the PalladiumAI server, deployment host or your computer");
    expect(screen).toContain("No network clients or arbitrary script execution");
    expect(screen).toContain("filesystem state does not persist");
  });
});
