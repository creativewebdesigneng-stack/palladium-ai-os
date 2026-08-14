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
  title: "Approve or reject a request",
  description:
    "Record the signed-in user's decision on a pending approval request. Approving may authorise an agent to spend money or act on the user's behalf. Workflow-step approvals must be decided in the PalladiumAI Approval Centre so the paused workflow can resume safely.",
  inputSchema: {
    approval_id: z.string().uuid().describe("The approval request to decide."),
    decision: z.enum(["approved", "rejected"]).describe("The user's decision."),
    note: z.string().trim().max(500).optional().describe("Optional note explaining the decision."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ approval_id, decision, note }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);

    // Read the request first so workflow gates cannot be decided through this
    // generic row-update path. Workflow approvals have durable pause/resume
    // semantics and must go through the authenticated workflow decision API.
    const { data: current, error: readError } = await supabase
      .from("approval_requests")
      .select("id,user_id,status,action_type,details")
      .eq("id", approval_id)
      .maybeSingle();
    if (readError) return { content: [{ type: "text", text: readError.message }], isError: true };
    if (!current || current.user_id !== ctx.getUserId()) {
      return {
        content: [{ type: "text", text: "No approval request found with that id." }],
        isError: true,
      };
    }
    if (
      current.action_type === "workflow_step" ||
      isWorkflowApproval(current.details)
    ) {
      return {
        content: [
          {
            type: "text",
            text: "Workflow-step approvals must be decided in the PalladiumAI Approval Centre so the workflow can resume safely.",
          },
        ],
        isError: true,
      };
    }
    if (current.status !== "pending") {
      return {
        content: [{ type: "text", text: "This approval request has already been decided." }],
        isError: true,
      };
    }

    const { data, error } = await supabase
      .from("approval_requests")
      .update({
        status: decision,
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