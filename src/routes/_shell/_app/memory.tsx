import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Memory";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-secondary-page blackstar-memory"><Screen /></div>;
}

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-secondary-page blackstar-memory"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/memory")({
  head: () => ({
    meta: [
      { title: "Memory — Blackstar" },
      { name: "description", content: "Long-term organisational memory for your workforce." },
      { property: "og:title", content: "Memory — Blackstar" },
      {
        property: "og:description",
        content: "Long-term organisational memory for your workforce.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
