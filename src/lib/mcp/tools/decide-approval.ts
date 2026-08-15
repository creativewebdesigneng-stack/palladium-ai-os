import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

function isWorkflowApproval(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const details = value as Record<string, unknown>;
  return (
    typeof details["workflow_run_id"] === "string" &&
    typeof details["workflow_id"] === "string" &&
    typeof details["workflow_step_id"] === "string"
  );
}

export default defineTool({
  name: "decide_approval",
  title: "Reject a request or direct the user to Approval Centre",
  description:
    "Reject a pending approval request. Approval must be confirmed in PalladiumAI's Approval Centre so spend limits, workflow resume and external-action execution gates cannot be bypassed.",
  inputSchema: {
    approval_id: z.string().uuid().describe("The approval request to decide."),
    decision: z.enum(["approved", "rejected"]).describe("The user's decision."),
    note: z.string().trim().max(500).optional().describe("Optional note explaining the decision."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ approval_id, decision, note }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);

    const { data: current, error: readError } = await supabase
      .from("approval_requests")
      .select("id,user_id,status,action_type,details")
      .eq("id", approval_id)
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (readError) return { content: [{ type: "text", text: readError.message }], isError: true };
    if (!current) {
      return {
        content: [{ type: "text", text: "No pending approval request found with that id." }],
        isError: true,
      };
    }
    if (current.status !== "pending") {
      return {
        content: [{ type: "text", text: "This approval request has already been decided." }],
        isError: true,
      };
    }

    if (decision === "approved") {
      const workflow = current.action_type === "workflow_step" || isWorkflowApproval(current.details);
      return {
        content: [
          {
            type: "text",
            text: workflow
              ? "Workflow-step approvals must be confirmed in PalladiumAI's Approval Centre so the paused workflow can resume safely."
              : "Approvals must be confirmed in PalladiumAI's Approval Centre so spend limits and external-action execution gates cannot be bypassed.",
          },
        ],
        isError: true,
      };
    }

    // Rejection is safe to expose here because it cannot authorise money movement
    // or an external side effect. Keep it owner-scoped and first-writer-wins.
    const { data, error } = await supabase
      .from("approval_requests")
      .update({
        status: "rejected",
        decided_at: new Date().toISOString(),
        decided_by: ctx.getUserId(),
        ...(note ? { decision_note: note } : {}),
      })
      .eq("id", approval_id)
      .eq("user_id", ctx.getUserId())
      .eq("status", "pending")
      .select("id,title,status,decided_at,decision_note")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data)
      return {
        content: [{ type: "text", text: "No pending approval request found with that id." }],
        isError: true,
      };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { approval: data },
    };
  },
});
