import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Team";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-longtail-page blackstar-team"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/team")({
  head: () => ({
    meta: [
      { title: "Team — Blackstar" },
      { name: "description", content: "Add existing account members and manage organisation roles and teams." },
      { property: "og:title", content: "Team — Blackstar" },
      { property: "og:description", content: "Add existing account members and manage organisation roles and teams." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
