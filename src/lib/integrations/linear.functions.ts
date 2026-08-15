import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { listLinearTeams, searchLinearIssues } from "./linear.server";

function limit(value: unknown, fallback: number, max: number): number {
  return Math.min(Math.max(Number(value ?? fallback) || fallback, 1), max);
}

export const listConnectedLinearTeams = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number }) => ({ limit: limit(input?.limit, 25, 50) }))
  .handler(async ({ data, context }) =>
    listLinearTeams({ userId: context.userId, limit: data.limit }),
  );

export const searchConnectedLinearIssues = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string; teamId?: string; limit?: number }) => {
    const query = String(input?.query ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
    if (!query) throw new Error("A Linear issue search query is required");
    const teamId = String(input?.teamId ?? "").trim();
    if (teamId && !/^[0-9a-fA-F-]{32,36}$/.test(teamId)) {
      throw new Error("A valid Linear team ID is required");
    }
    return {
      query,
      teamId: teamId || undefined,
      limit: limit(input?.limit, 20, 50),
    };
  })
  .handler(async ({ data, context }) =>
    searchLinearIssues({
      userId: context.userId,
      query: data.query,
      ...(data.teamId ? { teamId: data.teamId } : {}),
      limit: data.limit,
    }),
  );
