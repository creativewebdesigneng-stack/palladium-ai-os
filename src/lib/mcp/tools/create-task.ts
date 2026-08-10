import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_task",
  title: "Create mission",
  description:
    "Create a new Mission Control task (mission) for the signed-in user, optionally assigned to an agent.",
  inputSchema: {
    request: z.string().trim().min(1).max(2000).describe("What the user wants done."),
    title: z.string().trim().max(120).optional().describe("Short mission title."),
    category: z
      .string()
      .trim()
      .default("custom")
      .describe("Mission category, e.g. shopping, finance, health."),
    agent_id: z.string().uuid().optional().describe("Agent to assign the mission to."),
    priority: z
      .enum(["low", "normal", "high", "urgent"])
      .default("normal")
      .describe("Mission priority."),
    involves_money: z.boolean().default(false).describe("Whether the mission may spend money."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ request, title, category, agent_id, priority, involves_money }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const spends = involves_money ?? false;
    const { data, error } = await supabase
      .from("personal_tasks")
      .insert({
        user_id: ctx.getUserId(),
        request,
        ...(title ? { title } : {}),
        category: category ?? "custom",
        ...(agent_id ? { agent_id } : {}),
        priority: priority ?? "normal",
        involves_money: spends,
        requires_approval: spends,
      })
      .select(
        "id,title,request,category,status,priority,involves_money,requires_approval,created_at",
      )
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { task: data },
    };
  },
});
