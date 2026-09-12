import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AdminSubscriptions";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-final-page blackstar-admin-detail"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/admin/subscriptions")({
  head: () => ({
    meta: [
      { title: "Admin · Subscriptions — Blackstar" },
      { name: "description", content: "Plans, entitlements and renewals." },
      { property: "og:title", content: "Admin · Subscriptions — Blackstar" },
      { property: "og:description", content: "Plans, entitlements and renewals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
