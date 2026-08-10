import { createFileRoute } from "@tanstack/react-router";
import { ApiError, pageParams, scoped, withApiAuth } from "@/lib/devapi/api-auth.server";

const PATH = "/api/public/v1/workforces";

export const Route = createFileRoute("/api/public/v1/workforces")({
  server: {
    handlers: {
      GET: withApiAuth({ scope: "workforces:read", path: PATH }, async (ctx, request) => {
        const { limit, offset } = pageParams(request);
        const query = ctx.admin
          .from("workforces")
          .select("id,name,purpose,department,status,created_at")
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);
        const { data, error } = await scoped(query, ctx);
        if (error) throw new ApiError(500, "query_failed", error.message);

        const ids = (data ?? []).map((w: any) => w.id);
        const members = ids.length
          ? ((
              await ctx.admin
                .from("workforce_agents")
                .select("workforce_id,agent_id,role")
                .in("workforce_id", ids)
            ).data ?? [])
          : [];

        return {
          workforces: (data ?? []).map((w: any) => ({
            ...w,
            members: members
              .filter((m: any) => m.workforce_id === w.id)
              .map((m: any) => ({ agent_id: m.agent_id, role: m.role })),
          })),
          limit,
          offset,
        };
      }),
    },
  },
});
