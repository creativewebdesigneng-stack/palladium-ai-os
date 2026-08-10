import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_tasks",
  title: "List missions",
  description: "List the signed-in user's PalladiumAI Mission Control tasks, newest first.",
  inputSchema: {
    status: z
      .enum(["pending", "in_progress", "awaiting_approval", "completed", "failed", "cancelled"])
      .optional()
      .describe("Filter by task status."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(25)
      .describe("Maximum number of tasks to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("personal_tasks")
      .select(
        "id,title,request,category,status,priority,requires_approval,involves_money,due_at,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { tasks: data ?? [] },
    };
  },
});
