/**
 * Access helpers.
 *
 * The browser is NEVER the source of truth for authentication, subscriptions,
 * permissions or usage. Plan state is resolved server-side from the
 * `subscriptions` table (written only by verified Stripe webhooks) and reaches
 * the UI through AuthContext. There is no local override, no dev-admin bypass
 * and no localStorage flag — those were removed in the production audit.
 */

/** Every authenticated user may enter the OS on the Free "Explorer" plan.
 *  Paid capabilities are gated per-feature server-side (entitlements) and
 *  mirrored in the UI via src/lib/permissions.js. */
export function canAccessDashboard() {
  return true;
}

/** Read-only view of the caller's access state, derived from the server. */
export function useAccess(user) {
  const plan = user?.subscription_plan || user?.data?.subscription_plan || "free";
  return {
    plan,
    hasSubscription: plan !== "free",
    canAccess: canAccessDashboard(),
  };
}
