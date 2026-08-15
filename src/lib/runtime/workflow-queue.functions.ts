import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { queueWorkflowRun } from "./workflow-queue.server";

type Sb = { from: (t: string) => any };

export const queueWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { workflow_id: string; input: string }) => {
    const workflow_id = String(input?.workflow_id ?? "").trim();
    const objective = String(input?.input ?? "").trim();
    if (!workflow_id) throw new Error("A workflow is required.");
    if (!objective) throw new Error("Give the workforce an objective.");
    return { workflow_id, input: objective };
  })
  .handler(async ({ data, context }) => {
    return queueWorkflowRun({
      sb: context.supabase as unknown as Sb,
      userId: context.userId,
      workflowId: data.workflow_id,
      input: data.input,
      trigger: "manual",
    });
  });
