import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { readNotionPage, searchNotionPages } from "./notion.server";

function searchInput(input: { query: string; limit?: number }) {
  const query = String(input?.query ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 500);
  if (!query) throw new Error("A Notion page search query is required");
  return {
    query,
    limit: Math.min(Math.max(Number(input?.limit ?? 20) || 20, 1), 50),
  };
}

function pageInput(input: { pageId: string }) {
  const pageId = String(input?.pageId ?? "").trim();
  if (!/^[0-9a-fA-F-]{32,36}$/.test(pageId)) throw new Error("A valid Notion page ID is required");
  return { pageId };
}

export const searchConnectedNotionPages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(searchInput)
  .handler(async ({ data, context }) =>
    searchNotionPages({
      userId: context.userId,
      query: data.query,
      limit: data.limit,
    }),
  );

export const readConnectedNotionPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(pageInput)
  .handler(async ({ data, context }) =>
    readNotionPage({
      userId: context.userId,
      pageId: data.pageId,
    }),
  );
