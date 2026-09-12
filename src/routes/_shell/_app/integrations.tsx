import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Integrations";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-secondary-page blackstar-integrations"><Screen /></div>;
}

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-secondary-page blackstar-integrations"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — Blackstar" },
      { name: "description", content: "Browse the external provider capabilities Blackstar is designed to integrate with." },
      { property: "og:title", content: "Integrations — Blackstar" },
      { property: "og:description", content: "Browse the external provider capabilities Blackstar is designed to integrate with." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
