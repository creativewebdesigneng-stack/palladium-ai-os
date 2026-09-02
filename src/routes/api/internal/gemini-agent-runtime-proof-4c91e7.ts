import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { executeRun, failRun, prepareRun } from "@/lib/runtime/runtime.server";

const AGENT_ID = "cc1576f9-2c3a-4333-b002-fc1d46d05d2f";
const USER_ID = "7c4e5f60-f4f5-4009-ad41-37f20337720e";
const EXPECTED = "PALLADIUM_GEMINI_RUNTIME_OK";

export const Route = createFileRoute("/api/internal/gemini-agent-runtime-proof-4c91e7")({
  server: {
    handlers: {
      GET: async () => {
        const db = supabaseAdmin as any;
        const { data: before, error: loadError } = await db
          .from("personal_agents")
          .select("model_provider,model")
          .eq("id", AGENT_ID)
          .eq("user_id", USER_ID)
          .maybeSingle();
        if (loadError || !before) return json({ ok: false, stage: "load_agent", status: 500 });

        let run: Awaited<ReturnType<typeof prepareRun>> | null = null;
        try {
          const { error: updateError } = await db
            .from("personal_agents")
            .update({ model_provider: "gemini", model: "gemini-3.6-flash" })
            .eq("id", AGENT_ID)
            .eq("user_id", USER_ID);
          if (updateError) return json({ ok: false, stage: "bind_gemini", status: 500 });

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
              .select("id,status,provider,model,output_text,error,tokens_in,tokens_out,completed_at")
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
            task_id: task?.id ?? run.taskId,
            tokens_in: task?.tokens_in ?? null,
            tokens_out: task?.tokens_out ?? null,
            completed: Boolean(task?.completed_at),
            activity_kinds: Array.isArray(activities) ? activities.map((item: any) => item.kind) : [],
            error: task?.error ? "present" : null,
          });
        } catch (error) {
          if (run) await failRun({ userId: USER_ID, run, error });
          return json({ ok: false, stage: "runtime", status: 500, error_type: error instanceof Error ? error.name : "unknown" });
        } finally {
          await db
            .from("personal_agents")
            .update({ model_provider: before.model_provider, model: before.model })
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
