import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/CodeExplorer";
import RepositoryIntelligencePanel from "@/components/code/RepositoryIntelligencePanel";

function CodeExplorerRoute() {
  return (
    <>
      <Screen />
      <RepositoryIntelligencePanel />
    </>
  );
}

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-final-page blackstar-dev-detail"><CodeExplorerRoute /></div>;
}

export const Route = createFileRoute("/_shell/_app/code-explorer")({
  head: () => ({
    meta: [
      { title: "Code explorer — Blackstar" },
      { name: "description", content: "Browse connected repositories and run bounded read-only dependency and impact analysis." },
      { property: "og:title", content: "Code explorer — Blackstar" },
      { property: "og:description", content: "Browse connected repositories and run bounded read-only dependency and impact analysis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
