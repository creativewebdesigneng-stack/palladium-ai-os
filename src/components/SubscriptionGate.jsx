import { Outlet } from 'react-router-dom';

// Sits between ProtectedRoute (auth) and the app shell. Freemium model: every
// authenticated user enters on the Free "Explorer" plan — there is no route-
// level paywall. Paid capabilities are gated per-feature via the permissions
// system (src/lib/permissions.js) and the upgrade modal (UpgradeModal).
// Dev admins always pass (handled in AuthContext).
export default function SubscriptionGate() {
  return <Outlet />;
}