import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_memories",
  title: "List personal memory",
  description:
    "List entries from the signed-in user's PalladiumAI personal memory vault (preferences and facts agents use).",
  inputSchema: {
    category: z.string().trim().optional().describe("Filter by memory category."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(200)
      .default(50)
      .describe("Maximum number of entries to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("personal_memories")
      .select("id,category,key,value,updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 50);
    if (category) query = query.eq("category", category);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { memories: data ?? [] },
    };
  },
});
