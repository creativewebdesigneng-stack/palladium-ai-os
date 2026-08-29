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

export const Route = createFileRoute("/_shell/_app/code-explorer")({
  head: () => ({
    meta: [
      { title: "Code explorer — PalladiumAI" },
      { name: "description", content: "Browse connected repositories and run bounded read-only dependency and impact analysis." },
      { property: "og:title", content: "Code explorer — PalladiumAI" },
      { property: "og:description", content: "Browse connected repositories and run bounded read-only dependency and impact analysis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CodeExplorerRoute,
});
