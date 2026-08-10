import { createFileRoute } from "@tanstack/react-router";
import {
  ApiError,
  readJson,
  requireString,
  scoped,
  withApiAuth,
} from "@/lib/devapi/api-auth.server";

const PATH = "/api/public/v1/agents/$id/run";

export const Route = createFileRoute("/api/public/v1/agents/$id/run")({
  server: {
    handlers: {
      // Execution endpoint — plan gated (Explorer has no execution API).
      POST: withApiAuth(
        { scope: "agents:run", execution: true, path: PATH },
        async (ctx, request, params) => {
          const body = await readJson(request);
          const input = requireString(body, "input", 20_000);
          const agentId = String(params.id);

          const { data: agent } = await scoped(
            ctx.admin.from("personal_agents").select("id").eq("id", agentId),
            ctx,
          ).maybeSingle();
          if (!agent) throw new ApiError(404, "not_found", "No agent with that id.");

          const { prepareRun, executeRun, failRun } = await import("@/lib/runtime/runtime.server");
          let run: any = null;
          try {
            run = await prepareRun({ sb: ctx.admin, userId: ctx.userId, agentId, input });
            // agent.completed / agent.failed webhooks are emitted by the runtime.
            const task = await executeRun({ sb: ctx.admin, userId: ctx.userId, run });
            return { task, output: (task as any)?.output_text ?? "" };
          } catch (error) {
            if (run) await failRun({ userId: ctx.userId, run, error });
            throw new ApiError(
              422,
              "run_failed",
              error instanceof Error ? error.message : "The run could not complete.",
            );
          }
        },
      ),
    },
  },
});
