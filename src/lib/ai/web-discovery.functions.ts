import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { searchPublicWeb } from "@/lib/ai/web-access.server";
import { recordUsage } from "@/lib/platform/entitlements.server";
import { writeAudit } from "@/lib/platform/audit.server";

export const searchWeb = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string; limit?: number }) => {
    const query = String(input?.query ?? "").trim();
    if (query.length < 2) throw new Error("Enter a search query.");
    return {
      query: query.slice(0, 300),
      limit: Math.max(1, Math.min(Number(input?.limit ?? 8) || 8, 8)),
    };
  })
  .handler(async ({ data, context }) => {
    try {
      const result = await searchPublicWeb(data.query, data.limit);
      await recordUsage({
        userId: context.userId,
        metric: "web_search",
        quantity: 1,
        metadata: {
          query_length: data.query.length,
          result_count: result.results.length,
        },
      });
      await writeAudit({
        userId: context.userId,
        action: "web.search",
        targetType: "web_search",
        status: "success",
        metadata: {
          query: data.query.slice(0, 160),
          resultCount: result.results.length,
        },
      });
      return result;
    } catch (error) {
      await writeAudit({
        userId: context.userId,
        action: "web.search",
        targetType: "web_search",
        status: "failed",
        metadata: {
          query: data.query.slice(0, 160),
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw new Error(error instanceof Error ? error.message : "Live web search is temporarily unavailable.");
    }
  });
