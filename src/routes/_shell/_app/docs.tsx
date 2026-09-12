import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/DeveloperPortal";

function SpatialPage() {
 return <div className="blackstar-core-page blackstar-audit-page"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/docs")({
  head: () => ({
    meta: [
      { title: "Documentation — Blackstar" },
      { name: "description", content: "API references, guides and examples for building on Blackstar." },
      { property: "og:title", content: "Documentation — Blackstar" },
      { property: "og:description", content: "API references, guides and examples for building on Blackstar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
