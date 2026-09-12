import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Templates";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-final-page blackstar-dev-detail"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/templates")({
  head: () => ({
    meta: [
      { title: "Templates — Blackstar" },
      { name: "description", content: "Start from proven mission and agent templates." },
      { property: "og:title", content: "Templates — Blackstar" },
      { property: "og:description", content: "Start from proven mission and agent templates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
