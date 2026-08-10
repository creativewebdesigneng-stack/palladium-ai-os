import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "remember",
  title: "Save personal memory",
  description:
    "Save a preference or fact to the signed-in user's personal memory vault so agents can use it later.",
  inputSchema: {
    key: z.string().trim().min(1).max(120).describe("Memory key, e.g. 'preferred airline'."),
    value: z.string().trim().min(1).max(2000).describe("The value to remember."),
    category: z
      .string()
      .trim()
      .default("general")
      .describe("Memory category, e.g. shopping, health, travel."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ key, value, category }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    const cat = category ?? "general";
    const existing = await supabase
      .from("personal_memories")
      .select("id")
      .eq("key", key)
      .eq("category", cat)
      .maybeSingle();
    if (existing.error)
      return { content: [{ type: "text", text: existing.error.message }], isError: true };

    const { data, error } = existing.data
      ? await supabase
          .from("personal_memories")
          .update({ value })
          .eq("id", existing.data.id)
          .select("id,category,key,value,updated_at")
          .single()
      : await supabase
          .from("personal_memories")
          .insert({ user_id: userId, key, value, category: cat })
          .select("id,category,key,value,updated_at")
          .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { memory: data },
    };
  },
});
