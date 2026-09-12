import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/SystemMonitoring";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-final-page blackstar-admin-detail"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/admin/monitoring")({
  head: () => ({
    meta: [
      { title: "Admin · Monitoring — Blackstar" },
      { name: "description", content: "Health, latency and incident signals." },
      { property: "og:title", content: "Admin · Monitoring — Blackstar" },
      { property: "og:description", content: "Health, latency and incident signals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
