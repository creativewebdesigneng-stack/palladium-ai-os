import { createFileRoute } from "@tanstack/react-router";
import { ApiError, scoped, withApiAuth } from "@/lib/devapi/api-auth.server";
import { executeWorkflow, WorkforceError } from "@/lib/runtime/workforce.server";

const PATH = "/api/public/v1/workflows/$id/run";

export const Route = createFileRoute("/api/public/v1/workflows/$id/run")({
  server: {
    handlers: {
      // Execution endpoint — plan gated. Runs the real workforce engine.
      POST: withApiAuth(
        { scope: "workflows:run", execution: true, path: PATH },
        async (ctx, request, params) => {
          const workflowId = String(params.id);
          const { data: workflow } = await scoped(
            ctx.admin.from("workflows").select("id,name").eq("id", workflowId),
            ctx,
          ).maybeSingle();
          if (!workflow) throw new ApiError(404, "not_found", "No workflow with that id.");

          const body = (await request.json().catch(() => ({}))) as {
            input?: string;
            objective?: string;
          };
          const input = String(body.input ?? body.objective ?? "").trim();
          if (!input)
            throw new ApiError(400, "invalid_request", 'An "input" objective is required.');

          try {
            // The engine dispatches workflow.completed and records usage itself.
            const result = await executeWorkflow({
              sb: ctx.admin as never,
              userId: ctx.userId,
              workflowId,
              input,
              trigger: "api",
            });
            return { run: result.run, output: result.output, steps: result.steps };
          } catch (error) {
            if (error instanceof WorkforceError)
              throw new ApiError(400, "run_failed", error.message);
            throw error;
          }
        },
      ),
    },
  },
});
