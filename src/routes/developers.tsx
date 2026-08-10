import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Developers";

export const Route = createFileRoute("/developers")({
  head: () => ({
    meta: [
      { title: "Developers — PalladiumAI" },
      { name: "description", content: "APIs, SDKs, MCP support and a developer workspace for building on the PalladiumAI operating system." },
      { property: "og:title", content: "Developers — PalladiumAI" },
      { property: "og:description", content: "APIs, SDKs, MCP support and a developer workspace for building on the PalladiumAI operating system." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
