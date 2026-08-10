import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_agent",
  title: "Create AI agent",
  description: "Create a new PalladiumAI personal agent for the signed-in user.",
  inputSchema: {
    name: z.string().trim().min(1).max(80).describe("Agent name."),
    category: z
      .string()
      .trim()
      .min(1)
      .default("custom")
      .describe("Agent category, e.g. shopping, finance, health, business, custom."),
    purpose: z.string().trim().max(500).optional().describe("What the agent is responsible for."),
    autonomy: z
      .enum(["suggest", "prepare", "execute"])
      .default("prepare")
      .describe("How much the agent may do on its own."),
    requires_approval: z.boolean().default(true).describe("Require human approval before actions."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ name, category, purpose, autonomy, requires_approval }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("personal_agents")
      .insert({
        user_id: ctx.getUserId(),
        name,
        category: category ?? "custom",
        ...(purpose ? { purpose } : {}),
        autonomy: autonomy ?? "prepare",
        requires_approval: requires_approval ?? true,
      })
      .select("id,name,category,autonomy,status,requires_approval")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { agent: data },
    };
  },
});
