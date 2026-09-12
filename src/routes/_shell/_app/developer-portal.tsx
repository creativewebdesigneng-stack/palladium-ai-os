import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/DeveloperPortal";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-final-page blackstar-dev-detail"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/developer-portal")({
  head: () => ({
    meta: [
      { title: "Developer portal — Blackstar" },
      { name: "description", content: "API keys, webhooks and platform docs." },
      { property: "og:title", content: "Developer portal — Blackstar" },
      { property: "og:description", content: "API keys, webhooks and platform docs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
