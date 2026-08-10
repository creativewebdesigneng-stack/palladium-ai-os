import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AdminMarketplaceReview";

export const Route = createFileRoute("/_shell/_app/admin/marketplace")({
  head: () => ({
    meta: [
      { title: "Admin · Marketplace review — PalladiumAI" },
      { name: "description", content: "Review and approve submitted agents." },
      { property: "og:title", content: "Admin · Marketplace review — PalladiumAI" },
      { property: "og:description", content: "Review and approve submitted agents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
