import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AutonomousOS";

function SpatialPage() {
 return <div className="blackstar-core-page blackstar-audit-page"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/autonomous-os")({
  head: () => ({
    meta: [
      { title: "Autonomous OS — Blackstar" },
      { name: "description", content: "Persistent goals, specialist agent fleets and governed autonomous execution." },
      { property: "og:title", content: "Autonomous OS — Blackstar" },
      { property: "og:description", content: "Persistent goals, specialist agent fleets and governed autonomous execution." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
