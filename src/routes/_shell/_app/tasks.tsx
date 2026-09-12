import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Tasks";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-longtail-page blackstar-tasks"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — Blackstar" },
      { name: "description", content: "Track everything your AI workforce is working on." },
      { property: "og:title", content: "Tasks — Blackstar" },
      { property: "og:description", content: "Track everything your AI workforce is working on." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
