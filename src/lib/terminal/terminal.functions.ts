import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertWithinLimit, getEntitlements, recordUsage } from "@/lib/platform/entitlements.server";
import { writeAudit } from "@/lib/platform/audit.server";
import { executeTerminalCommand, terminalConfigured, validateTerminalCommand } from "./terminal.server";

type Sb = { from: (table: string) => any };

export const getTerminalStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({
    configured: terminalConfigured(),
    provider: terminalConfigured() ? "e2b" : null,
    mode: "diagnostic" as const,
    limits: {
      commandTimeoutSeconds: 15,
      sandboxLifetimeSeconds: 60,
      outputCharacters: 20_000,
      persistentFilesystem: false,
      hostAccess: false,
      arbitraryCode: false,
      networkClients: false,
    },
  }));

export const runTerminalCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { command: string }) => ({
    command: validateTerminalCommand(String(input?.command ?? "")),
  }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const entitlements = await getEntitlements(sb, context.userId);
    assertWithinLimit(entitlements, "tasks_per_month");

    try {
      const result = await executeTerminalCommand(data.command);
      const success = result.exitCode === 0;
      await recordUsage({
        userId: context.userId,
        metric: "terminal_command",
        quantity: 1,
        metadata: {
          provider: result.provider,
          duration_ms: result.durationMs,
          exit_code: result.exitCode,
          mode: "diagnostic",
        },
      });
      await writeAudit({
        userId: context.userId,
        action: "terminal.command",
        targetType: "sandbox",
        targetId: result.sandboxId,
        status: success ? "success" : "failed",
        metadata: {
          command: result.command.slice(0, 240),
          provider: result.provider,
          duration_ms: result.durationMs,
          exit_code: result.exitCode,
          mode: "diagnostic",
        },
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Terminal command failed.";
      await writeAudit({
        userId: context.userId,
        action: "terminal.command",
        targetType: "sandbox",
        status: "failed",
        metadata: { command: data.command.slice(0, 240), error: message, mode: "diagnostic" },
      });
      throw new Error(message === "E2B sandbox is not configured." ? message : "Isolated terminal execution failed.");
    }
  });
