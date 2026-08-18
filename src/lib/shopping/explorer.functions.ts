import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { googleShoppingConfigured } from "./google-shopping.server";

type Sb = { from: (table: string) => any };

function isHttpUrl(value: unknown): boolean {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function truthyMarker(value: unknown): boolean {
  return value === true || String(value ?? "").toLowerCase() === "true";
}

function isVerifiedProduct(row: any): boolean {
  const specs = row?.specs && typeof row.specs === "object" && !Array.isArray(row.specs)
    ? row.specs as Record<string, unknown>
    : {};
  const trustedLiveSource = truthyMarker(specs["verified_product_page"])
    || truthyMarker(specs["google_shopping"]);
  return trustedLiveSource
    && isHttpUrl(specs["image_url"])
    && isHttpUrl(row?.url)
    && !String(row?.reason ?? "").includes("SIMULATED DEVELOPMENT DATA");
}

/**
 * Returns only the newest shopping search's live, product-level results.
 * Historical/demo rows are intentionally excluded so a new search that finds
 * zero genuine products can never appear to have recycled older results.
 * Google Shopping rows and retailer-page-verified rows share this same contract.
 */
export const getLatestVerifiedExplorerResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;

    const latestTask = await sb
      .from("shopping_tasks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestTask.error) throw new Error(latestTask.error.message);
    if (!latestTask.data?.id) {
      return {
        task: null,
        results: [],
        purchases: [],
        rejectedUnverified: 0,
        googleShoppingConfigured: googleShoppingConfigured(),
      };
    }

    const [resultRows, purchaseRows] = await Promise.all([
      sb
        .from("shopping_results")
        .select("*")
        .eq("shopping_task_id", latestTask.data.id)
        .order("created_at", { ascending: false }),
      sb
        .from("purchase_requests")
        .select("*")
        .eq("shopping_task_id", latestTask.data.id)
        .order("created_at", { ascending: false }),
    ]);
    if (resultRows.error) throw new Error(resultRows.error.message);
    if (purchaseRows.error) throw new Error(purchaseRows.error.message);

    const allResults = resultRows.data ?? [];
    const results = allResults.filter(isVerifiedProduct);
    return {
      task: latestTask.data,
      results,
      purchases: purchaseRows.data ?? [],
      rejectedUnverified: Math.max(0, allResults.length - results.length),
      googleShoppingConfigured: googleShoppingConfigured(),
    };
  });
