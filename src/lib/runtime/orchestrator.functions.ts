/** Authenticated Palladium Orchestrator API. */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { orchestrateGoal, OrchestratorError } from "./orchestrator.server";

type Sb = { from: (table: string) => any };

function surface(error: unknown): never {
  if (error instanceof OrchestratorError) throw new Error(error.message);
  console.error("[orchestrator.api]", error);
  throw new Error(error instanceof Error ? error.message : "The Orchestrator is unavailable.");
}

/**
 * Turns a high-level objective into a generated specialist workflow and runs it.
 * Caller identity and all accessible-agent/workforce checks are server-side.
 */
export const runOrchestrator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { goal: string; workforce_id?: string | null; org_id?: string | null }) => ({
      goal: String(input?.goal ?? "").trim(),
      workforce_id: input?.workforce_id ? String(input.workforce_id) : null,
      org_id: input?.org_id ? String(input.org_id) : null,
    }),
  )
  .handler(async ({ data, context }) => {
    try {
      return await orchestrateGoal({
        sb: context.supabase as unknown as Sb,
        userId: context.userId,
        goal: data.goal,
        workforceId: data.workforce_id,
        orgId: data.org_id,
      });
    } catch (error) {
      surface(error);
    }
  });
