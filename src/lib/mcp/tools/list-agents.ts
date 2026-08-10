import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_agents",
  title: "List AI agents",
  description: "List the signed-in user's PalladiumAI personal agents with their category, autonomy level and status.",
  inputSchema: {
    status: z.enum(["active", "paused", "archived"]).optional().describe("Filter by agent status."),
    limit: z.number().int().min(1).max(100).default(25).describe("Maximum number of agents to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("personal_agents")
      .select("id,name,category,purpose,autonomy,status,requires_approval,allowed_tools,created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { agents: data ?? [] },
    };
  },
});
