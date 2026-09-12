import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Marketing";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-secondary-page blackstar-marketing"><Screen /></div>;
}

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-secondary-page blackstar-marketing"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/marketing")({
  head: () => ({
    meta: [
      { title: "Marketing — Blackstar" },
      { name: "description", content: "Campaigns, content and growth on autopilot." },
      { property: "og:title", content: "Marketing — Blackstar" },
      { property: "og:description", content: "Campaigns, content and growth on autopilot." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
