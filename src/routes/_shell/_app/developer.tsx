import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/DeveloperWorkspace";

export const Route = createFileRoute("/_shell/_app/developer")({
  head: () => ({
    meta: [
      { title: "Developer Workspace — PalladiumAI" },
      { name: "description", content: "Code, debug, version and deploy from one focused environment." },
      { property: "og:title", content: "Developer Workspace — PalladiumAI" },
      { property: "og:description", content: "Code, debug, version and deploy from one focused environment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
