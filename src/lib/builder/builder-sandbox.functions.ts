import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runBuilderSandboxValidation } from "./builder-sandbox.server";

type Sb = { from: (table: string) => any };

const jobInput = z.object({ id: z.string().uuid() });
const sandboxColumns = "id,sandbox_status,sandbox_provider,sandbox_id,sandbox_results,sandbox_last_error,sandbox_started_at,sandbox_finished_at,updated_at";

function mapState(row: any) {
  return {
    id: String(row.id),
    sandboxStatus: row.sandbox_status ? String(row.sandbox_status) : "not_started",
    sandboxProvider: row.sandbox_provider ? String(row.sandbox_provider) : null,
    sandboxId: row.sandbox_id ? String(row.sandbox_id) : null,
    sandboxResults: row.sandbox_results ?? null,
    sandboxLastError: row.sandbox_last_error ? String(row.sandbox_last_error) : null,
    sandboxStartedAt: row.sandbox_started_at ? String(row.sandbox_started_at) : null,
    sandboxFinishedAt: row.sandbox_finished_at ? String(row.sandbox_finished_at) : null,
    updatedAt: String(row.updated_at),
  };
}

export const listBuilderSandboxStates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb
      .from("builder_jobs")
      .select(sandboxColumns)
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(25);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapState);
  });

export const runBuilderSandboxJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => jobInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const startedAt = new Date().toISOString();

    const { data: claimed, error: claimError } = await sb
      .from("builder_jobs")
      .update({
        sandbox_status: "provisioning",
        sandbox_provider: "e2b",
        sandbox_id: null,
        sandbox_results: null,
        sandbox_last_error: null,
        sandbox_started_at: startedAt,
        sandbox_finished_at: null,
        updated_at: startedAt,
      })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .eq("source_status", "generated")
      .eq("repository_status", "files_applied")
      .in("sandbox_status", ["not_started", "failed"])
      .in("repair_status", ["not_started", "accepted", "failed"])
      .select("id,source_manifest," + sandboxColumns)
      .maybeSingle();
    if (claimError) throw new Error(claimError.message);
    if (!claimed?.source_manifest) throw new Error("This build request is not ready for isolated validation.");

    try {
      const { data: running, error: runningError } = await sb
        .from("builder_jobs")
        .update({ sandbox_status: "running", updated_at: new Date().toISOString() })
        .eq("id", data.id)
        .eq("user_id", context.userId)
        .eq("sandbox_status", "provisioning")
        .select("id")
        .maybeSingle();
      if (runningError) throw new Error(runningError.message);
      if (!running) throw new Error("Sandbox validation was interrupted before execution started.");

      const result = await runBuilderSandboxValidation({
        builderJobId: String(claimed.id),
        sourceManifest: claimed.source_manifest,
      });
      const finishedAt = new Date().toISOString();
      const finalStatus = result.passed ? "passed" : "failed";
      const safeError = result.passed ? null : "One or more isolated validation stages failed.";

      const { data: completed, error: completeError } = await sb
        .from("builder_jobs")
        .update({
          sandbox_status: finalStatus,
          sandbox_provider: result.provider,
          sandbox_id: result.sandboxId,
          sandbox_results: result,
          sandbox_last_error: safeError,
          sandbox_finished_at: finishedAt,
          updated_at: finishedAt,
        })
        .eq("id", data.id)
        .eq("user_id", context.userId)
        .eq("sandbox_status", "running")
        .select(sandboxColumns)
        .maybeSingle();
      if (completeError) throw new Error(completeError.message);
      if (!completed) throw new Error("Sandbox validation result could not be persisted.");
      return mapState(completed);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Isolated validation failed.";
      const safeMessage = message === "E2B sandbox is not configured." ? message : message.startsWith("Sandbox validation") ? message : "Isolated validation failed. Review the sandbox logs and retry.";
      const finishedAt = new Date().toISOString();
      const { error: failureError } = await sb
        .from("builder_jobs")
        .update({ sandbox_status: "failed", sandbox_last_error: safeMessage, sandbox_finished_at: finishedAt, updated_at: finishedAt })
        .eq("id", data.id)
        .eq("user_id", context.userId)
        .in("sandbox_status", ["provisioning", "running"]);
      if (failureError) console.error("[builder:sandbox] could not persist failure", failureError.message);
      console.error("[builder:sandbox] validation failed", error);
      throw new Error(safeMessage);
    }
  });
