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
    category: row.category as string,
    type: "agent",
    status: dbToUiStatus(row.status as string),
    version: (row.version ?? "1.0.0") as string,
    features: (row.tags ?? []) as string[],
    price: Number(row.price_pence ?? 0) / 100,
    currency: (row.currency ?? "GBP") as string,
    required_plan: (row.required_plan ?? "free") as string,
    revenue_share: Number(row.revenue_share ?? 30),
    usage_requirements: (row.usage_requirements ?? "") as string,
    review_notes: (row.review_notes ?? "") as string,
    rating: Number(row.rating_avg ?? 0),
    reviews_count: Number(row.rating_count ?? 0),
    downloads: Number(row.install_count ?? 0),
    is_featured: Number(row.install_count ?? 0) >= 25,
    creator_id: row.publisher_id as string,
    creator_name: (creator?.display_name ?? "Unknown") as string,
    agent_id: (row.agent_id ?? null) as string | null,
    created_date: row.created_at as string,
    published_at: (row.published_at ?? null) as string | null,
    metadata: { ...metadata, verified: !!creator?.verified },
  };
}

/** Attaches creator display names to a batch of listing rows in one query. */
export async function withCreators(sb: { from: (t: string) => any }, rows: Row[]) {
  const ids = [...new Set(rows.map((r) => r.publisher_id).filter(Boolean))];
  if (!ids.length) return rows.map((r) => toListingDTO(r));
  const { data } = await sb
    .from("creator_profiles")
    .select("user_id,display_name,verified")
    .in("user_id", ids);
  const byId = new Map((data ?? []).map((c: Row) => [c.user_id, c]));
  return rows.map((r) => toListingDTO(r, byId.get(r.publisher_id) ?? null));
}

/** True when the caller holds the platform `admin` role. */
export async function isPlatformAdmin(
  sb: { rpc: (fn: string, args?: Record<string, unknown>) => any },
  userId: string,
) {
  const { data } = await sb.rpc("has_role", { _user_id: userId, _role: "admin" });
  return data === true;
}
