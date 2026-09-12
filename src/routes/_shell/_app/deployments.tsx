import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Deployments";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-final-page blackstar-dev-detail"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/deployments")({
  head: () => ({
    meta: [
      { title: "Deployments — Blackstar" },
      { name: "description", content: "Ship and monitor releases from one place." },
      { property: "og:title", content: "Deployments — Blackstar" },
      { property: "og:description", content: "Ship and monitor releases from one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
