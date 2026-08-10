import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Organisation";

export const Route = createFileRoute("/_shell/_app/organisation")({
  head: () => ({
    meta: [
      { title: "Organisations & Teams — PalladiumAI" },
      { name: "description", content: "Create shared PalladiumAI workspaces, invite people, assign owner, admin and member roles, and group them into teams." },
      { property: "og:title", content: "Organisations & Teams — PalladiumAI" },
      { property: "og:description", content: "Shared AI workforce workspaces with server-enforced roles, seats and permissions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
