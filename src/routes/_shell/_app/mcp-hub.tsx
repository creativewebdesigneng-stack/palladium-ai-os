import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/McpHub";

export const Route = createFileRoute("/_shell/_app/mcp-hub")({
  head: () => ({
    meta: [
      { title: "MCP hub — PalladiumAI" },
      { name: "description", content: "Connect MCP servers to your workforce." },
      { property: "og:title", content: "MCP hub — PalladiumAI" },
      { property: "og:description", content: "Connect MCP servers to your workforce." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
