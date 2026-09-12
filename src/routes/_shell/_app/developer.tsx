import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/DeveloperWorkspace";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-final-page blackstar-dev-detail"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/developer")({
  head: () => ({
    meta: [
      { title: "Developer Workspace — Blackstar" },
      { name: "description", content: "Review developer-workspace availability and the production services required to enable it." },
      { property: "og:title", content: "Developer Workspace — Blackstar" },
      { property: "og:description", content: "Review developer-workspace availability and the production services required to enable it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
