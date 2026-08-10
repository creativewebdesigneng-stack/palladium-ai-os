import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_approvals",
  title: "List approval requests",
  description:
    "List Approval Centre requests awaiting the signed-in user's decision, including estimated cost and risk.",
  inputSchema: {
    status: z
      .enum(["pending", "approved", "rejected", "expired"])
      .default("pending")
      .describe("Filter by decision status."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(25)
      .describe("Maximum number of requests to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("approval_requests")
      .select(
        "id,title,summary,action_type,estimated_cost,currency,risk_level,status,task_id,agent_id,created_at",
      )
      .eq("status", status ?? "pending")
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { approvals: data ?? [] },
    };
  },
});
