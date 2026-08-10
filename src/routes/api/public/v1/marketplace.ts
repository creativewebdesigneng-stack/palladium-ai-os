import { createFileRoute } from "@tanstack/react-router";
import { ApiError, pageParams, withApiAuth } from "@/lib/devapi/api-auth.server";

const PATH = "/api/public/v1/marketplace";

export const Route = createFileRoute("/api/public/v1/marketplace")({
  server: {
    handlers: {
      GET: withApiAuth({ scope: "marketplace:read", path: PATH }, async (ctx, request) => {
        const { limit, offset } = pageParams(request);
        const url = new URL(request.url);
        const category = url.searchParams.get("category");

        // Marketplace listings are catalogue data — published items only.
        let query = ctx.admin
          .from("marketplace_agents")
          .select(
            "id,title,slug,summary,category,tags,icon,price_pence,currency,install_count,rating_avg,rating_count,published_at",
          )
          .eq("status", "published")
          .order("install_count", { ascending: false })
          .range(offset, offset + limit - 1);
        if (category) query = query.eq("category", category);

        const { data, error } = await query;
        if (error) throw new ApiError(500, "query_failed", error.message);
        return { listings: data ?? [], limit, offset };
      }),
    },
  },
});
