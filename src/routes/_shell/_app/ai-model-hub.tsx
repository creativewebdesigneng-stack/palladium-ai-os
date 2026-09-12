import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AIModelHub";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-longtail-page blackstar-modelhub"><Screen /></div>;
}

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-longtail-page blackstar-modelhub"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/ai-model-hub")({
  head: () => ({
    meta: [
      { title: "Model hub — Blackstar" },
      { name: "description", content: "Open Blackstar's authoritative runtime model state." },
      { property: "og:title", content: "Model hub — Blackstar" },
      { property: "og:description", content: "Open Blackstar's authoritative runtime model state." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
