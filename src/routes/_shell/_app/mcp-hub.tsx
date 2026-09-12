import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/McpHub";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-final-page blackstar-dev-detail"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/mcp-hub")({
  head: () => ({
    meta: [
      { title: "MCP hub — Blackstar" },
      { name: "description", content: "Inspect the live OAuth-protected MCP server and tools bundled with Blackstar." },
      { property: "og:title", content: "MCP hub — Blackstar" },
      { property: "og:description", content: "Inspect the live OAuth-protected MCP server and tools bundled with Blackstar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
