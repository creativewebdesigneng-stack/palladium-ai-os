import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { searchSalesforceAccounts, searchSalesforceOpportunities } from "./salesforce.server";

function searchInput(input: { query: string; limit?: number }) {
  const query = String(input?.query ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 200);
  if (!query) throw new Error("A Salesforce search query is required");
  return {
    query,
    limit: Math.min(Math.max(Number(input?.limit ?? 20) || 20, 1), 50),
  };
}

export const searchConnectedSalesforceAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(searchInput)
  .handler(async ({ data, context }) =>
    searchSalesforceAccounts({
      userId: context.userId,
      query: data.query,
      limit: data.limit,
    }),
  );

export const searchConnectedSalesforceOpportunities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(searchInput)
  .handler(async ({ data, context }) =>
    searchSalesforceOpportunities({
      userId: context.userId,
      query: data.query,
      limit: data.limit,
    }),
  );
