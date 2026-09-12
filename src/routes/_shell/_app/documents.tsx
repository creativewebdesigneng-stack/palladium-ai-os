import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Documents";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-secondary-page blackstar-documents"><Screen /></div>;
}

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-secondary-page blackstar-documents"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/documents")({
  head: () => ({
    meta: [
      { title: "Documents — Blackstar" },
      { name: "description", content: "Draft, review and store business documents." },
      { property: "og:title", content: "Documents — Blackstar" },
      { property: "og:description", content: "Draft, review and store business documents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
