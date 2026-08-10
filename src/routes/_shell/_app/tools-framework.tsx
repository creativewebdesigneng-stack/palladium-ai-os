import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/ToolsFramework";

export const Route = createFileRoute("/_shell/_app/tools-framework")({
  head: () => ({
    meta: [
      { title: "Tools framework — PalladiumAI" },
      { name: "description", content: "Define, test and permission the tools agents can call." },
      { property: "og:title", content: "Tools framework — PalladiumAI" },
      {
        property: "og:description",
        content: "Define, test and permission the tools agents can call.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
