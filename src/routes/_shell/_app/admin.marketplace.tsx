import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AdminMarketplaceReview";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-final-page blackstar-admin-detail"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/admin/marketplace")({
  head: () => ({
    meta: [
      { title: "Admin · Marketplace review — Blackstar" },
      { name: "description", content: "Review and approve submitted agents." },
      { property: "og:title", content: "Admin · Marketplace review — Blackstar" },
      { property: "og:description", content: "Review and approve submitted agents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
