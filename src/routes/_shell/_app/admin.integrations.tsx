import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AdminIntegrations";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-final-page blackstar-admin-detail"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/admin/integrations")({
  head: () => ({
    meta: [
      { title: "Admin · Integrations — Blackstar" },
      { name: "description", content: "Global connector configuration." },
      { property: "og:title", content: "Admin · Integrations — Blackstar" },
      { property: "og:description", content: "Global connector configuration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
