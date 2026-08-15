import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getSlackChannelHistory, listSlackChannels } from "./slack.server";

export const listConnectedSlackChannels = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number; cursor?: string } | undefined) => ({
    limit: Math.min(Math.max(Number(input?.limit ?? 50) || 50, 1), 100),
    cursor: typeof input?.cursor === "string" ? input.cursor.trim().slice(0, 500) : "",
  }))
  .handler(async ({ data, context }) =>
    listSlackChannels({
      userId: context.userId,
      limit: data.limit,
      ...(data.cursor ? { cursor: data.cursor } : {}),
    }),
  );

export const getConnectedSlackChannelHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { channelId: string; limit?: number }) => {
    const channelId = String(input?.channelId ?? "").trim();
    if (!channelId) throw new Error("Slack channel id is required");
    return {
      channelId,
      limit: Math.min(Math.max(Number(input?.limit ?? 30) || 30, 1), 100),
    };
  })
  .handler(async ({ data, context }) =>
    getSlackChannelHistory({
      userId: context.userId,
      channelId: data.channelId,
      limit: data.limit,
    }),
  );
