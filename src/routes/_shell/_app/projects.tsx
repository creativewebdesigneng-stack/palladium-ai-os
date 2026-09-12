import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Projects";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-longtail-page blackstar-projects"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/projects")({
  head: () => ({
    meta: [
      { title: "Projects — Blackstar" },
      { name: "description", content: "Create and manage persistent personal and organisation projects in Blackstar." },
      { property: "og:title", content: "Projects — Blackstar" },
      { property: "og:description", content: "Create and manage persistent personal and organisation projects in Blackstar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
