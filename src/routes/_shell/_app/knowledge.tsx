import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Knowledge";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-longtail-page blackstar-knowledge"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge — Blackstar" },
      { name: "description", content: "Curate the knowledge base your agents rely on." },
      { property: "og:title", content: "Knowledge — Blackstar" },
      { property: "og:description", content: "Curate the knowledge base your agents rely on." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
