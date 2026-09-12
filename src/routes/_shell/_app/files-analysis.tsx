import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/FileAnalysis";

function SpatialPage() {
 return <div className="blackstar-core-page blackstar-audit-page"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/files-analysis")({
  head: () => ({
    meta: [
      { title: "File analysis — Blackstar" },
      { name: "description", content: "Extract insight from documents, sheets and media." },
      { property: "og:title", content: "File analysis — Blackstar" },
      { property: "og:description", content: "Extract insight from documents, sheets and media." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
