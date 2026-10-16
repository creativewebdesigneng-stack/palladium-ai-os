import {marketplaceSaleFee} from './fees';
/**
 * Marketplace helpers (server-only).
 *
 * Shape translation between the `marketplace_agents` table and the listing DTO
 * the marketplace UI consumes, plus the platform-admin check used by review.
 */

// Rows come from the Data API untyped at this boundary; the DTO below is the
// typed contract the UI consumes.
export type Row = any;

export function slugify(input: string) {
  return (
    String(input)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "agent"
  );
}

/** The UI calls the unlisted state "removed"; the database calls it "unlisted". */
export const UI_TO_DB_STATUS: Record<string, string> = {
  draft: "draft",
  pending_review: "pending_review",
  published: "published",
  rejected: "rejected",
  removed: "unlisted",
  unlisted: "unlisted",
};

export function dbToUiStatus(status: string) {
  return status === "unlisted" ? "removed" : status;
}

/** Maps a listing row (+ optional creator profile) to the listing DTO. */
export function toListingDTO(row: Row, creator?: Row | null) {
  const metadata = (row.metadata as Row) ?? {};
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description ?? row.summary ?? "") as string,
    category: (metadata.category ?? row.item_type ?? row.category ?? "agent") as string,
    type: "agent",
    status: dbToUiStatus(row.status as string),
    version: (metadata.version ?? row.version ?? "1.0.0") as string,
    features: (row.tags ?? []) as string[],
    price: Number(row.price_pence ?? 0) / 100,
    currency: (row.currency ?? "GBP") as string,
    required_plan: (metadata.required_plan ?? row.required_plan ?? "free") as string,
    revenue_share: marketplaceSaleFee(Number(row.price_pence ?? 0)).ratePercent,
    usage_requirements: (metadata.usage_requirements ?? row.usage_requirements ?? "") as string,
    review_notes: (row.review_notes ?? "") as string,
    rating: Number(row.rating_avg ?? 0),
    reviews_count: Number(row.rating_count ?? 0),
    downloads: null,
    is_featured: false,
    creator_id: (row.seller_id ?? row.publisher_id) as string,
    creator_name: (creator?.display_name ?? "Unknown") as string,
    agent_id: (row.agent_id ?? null) as string | null,
    created_date: row.created_at as string,
    published_at: (row.published_at ?? null) as string | null,
    metadata: { ...metadata, verified: creator?.verification_status === 'verified' },
  };
}

/** Attaches creator display names to a batch of listing rows in one query. */
export async function withCreators(sb: { from: (t: string) => any }, rows: Row[]) {
  const ids = [...new Set(rows.map((r) => r.seller_id ?? r.publisher_id).filter(Boolean))];
  if (!ids.length) return rows.map((r) => toListingDTO(r));
  const { data, error } = await sb
    .from("marketplace_seller_profiles")
    .select("user_id,display_name,verification_status")
    .in("user_id", ids);
  if(error)throw new Error("Could not load creator profiles.");
  const {data:reviews,error:reviewError}=await sb.from('marketplace_reviews').select('listing_id,rating').in('listing_id',rows.map(r=>r.id));
  if(reviewError)throw new Error('Could not load verified marketplace reviews.');
  const byId = new Map((data ?? []).map((c: Row) => [c.user_id, c]));
  return rows.map((r) => {
    const ratings=(reviews??[]).filter((review:Row)=>review.listing_id===r.id);
    return toListingDTO({...r,rating_avg:ratings.length?ratings.reduce((sum:number,review:Row)=>sum+Number(review.rating),0)/ratings.length:0,rating_count:ratings.length},byId.get(r.seller_id??r.publisher_id)??null);
  });
}

/** True when the caller holds the platform `admin` role. */
export async function isPlatformAdmin(
  sb: { rpc: (fn: string, args?: Record<string, unknown>) => any },
  userId: string,
) {
  const { data, error } = await sb.rpc("has_role", { _user_id: userId, _role: "admin" });
  return !error && data === true;
}
