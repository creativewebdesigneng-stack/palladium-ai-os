import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { searchHubSpotContacts, searchHubSpotDeals } from "./hubspot.server";

function searchInput(input: { query: string; limit?: number }) {
  const query = String(input?.query ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 1000);
  if (!query) throw new Error("A HubSpot search query is required");
  return {
    query,
    limit: Math.min(Math.max(Number(input?.limit ?? 20) || 20, 1), 100),
  };
}

export const searchConnectedHubSpotContacts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(searchInput)
  .handler(async ({ data, context }) =>
    searchHubSpotContacts({
      userId: context.userId,
      query: data.query,
      limit: data.limit,
    }),
  );

export const searchConnectedHubSpotDeals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(searchInput)
  .handler(async ({ data, context }) =>
    searchHubSpotDeals({
      userId: context.userId,
      query: data.query,
      limit: data.limit,
    }),
  );
