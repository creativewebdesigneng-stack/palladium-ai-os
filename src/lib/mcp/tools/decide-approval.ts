import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "decide_approval",
  title: "Approve or reject a request",
  description:
    "Record the signed-in user's decision on a pending approval request. Approving may authorise an agent to spend money or act on the user's behalf.",
  inputSchema: {
    approval_id: z.string().uuid().describe("The approval request to decide."),
    decision: z.enum(["approved", "rejected"]).describe("The user's decision."),
    note: z.string().trim().max(500).optional().describe("Optional note explaining the decision."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ approval_id, decision, note }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("approval_requests")
      .update({
        status: decision,
        decided_at: new Date().toISOString(),
        decided_by: ctx.getUserId(),
        ...(note ? { decision_note: note } : {}),
      })
      .eq("id", approval_id)
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
