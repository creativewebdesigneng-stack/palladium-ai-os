import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Analytics";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-secondary-page blackstar-analytics"><Screen /></div>;
}

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-secondary-page blackstar-analytics"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Blackstar" },
      { name: "description", content: "Outcome-level reporting for your AI workforce." },
      { property: "og:title", content: "Analytics — Blackstar" },
      { property: "og:description", content: "Outcome-level reporting for your AI workforce." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
