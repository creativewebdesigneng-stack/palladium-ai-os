import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { executeRun, failRun, prepareRun } from "@/lib/runtime/runtime.server";

const AGENT_ID = "8d702f3d-f67c-4c4f-bf02-9e415e6c546c";
const USER_ID = "7c4e5f60-f4f5-4009-ad41-37f20337720e";
const EXPECTED = "PALLADIUM_RUNTIME_OK";

export const Route = createFileRoute("/api/internal/openai-runtime-proof-final-6a8d3c")({
  server: {
    handlers: {
      GET: async () => {
        const db = supabaseAdmin as any;
        const { data: before, error: loadError } = await db
          .from("personal_agents")
          .select("status,model_provider,model")
          .eq("id", AGENT_ID)
          .eq("user_id", USER_ID)
          .maybeSingle();

        if (loadError || !before) {
          return json({ ok: false, stage: "load_agent", error: loadError?.message ?? null });
        }

        let run: Awaited<ReturnType<typeof prepareRun>> | null = null;
        try {
          const { error: updateError } = await db
            .from("personal_agents")
            .update({ status: "active", model_provider: "openai", model: "gpt-4.1-mini" })
            .eq("id", AGENT_ID)
            .eq("user_id", USER_ID);

          if (updateError) return json({ ok: false, stage: "prepare_agent", error: updateError.message });

          run = await prepareRun({
            sb: db,
            userId: USER_ID,
            agentId: AGENT_ID,
            input: `Reply with exactly: ${EXPECTED}`,
          });

          await executeRun({ sb: db, userId: USER_ID, run, timeoutMs: 45_000 });

          const [{ data: task }, { data: activities }] = await Promise.all([
            db
              .from("agent_tasks")
              .select("id,status,provider,model,output_text,error,tokens_in,tokens_out,duration_ms,completed_at")
              .eq("id", run.taskId)
              .maybeSingle(),
            db
              .from("agent_activities")
              .select("kind")
              .eq("agent_id", AGENT_ID)
              .contains("metadata", { task_id: run.taskId }),
          ]);

          const output = String(task?.output_text ?? "").trim();
          return json({
            ok: task?.status === "succeeded" && output === EXPECTED,
            status: task?.status ?? null,
            provider: task?.provider ?? null,
            model: task?.model ?? null,
            exact_output: output === EXPECTED,
            output,
            task_id: task?.id ?? run.taskId,
            tokens_in: task?.tokens_in ?? null,
            tokens_out: task?.tokens_out ?? null,
            duration_ms: task?.duration_ms ?? null,
            completed: Boolean(task?.completed_at),
            activity_kinds: Array.isArray(activities) ? activities.map((item: any) => item.kind) : [],
            error: task?.error ?? null,
          });
        } catch (error) {
          if (run) await failRun({ userId: USER_ID, run, error });
          return json({
            ok: false,
            stage: "runtime",
            error_type: error instanceof Error ? error.name : "unknown",
            error_message: error instanceof Error ? error.message : String(error),
          });
        } finally {
          await db
            .from("personal_agents")
            .update({ status: before.status, model_provider: before.model_provider, model: before.model })
            .eq("id", AGENT_ID)
            .eq("user_id", USER_ID);
        }
      },
    },
  },
});

function json(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
