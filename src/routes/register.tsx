import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Register";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex,nofollow" },
      { title: "Create account — Blackstar" },
      {
        name: "description",
        content: "Create your Blackstar account and deploy your first AI agents in minutes.",
      },
      { property: "og:title", content: "Create account — Blackstar" },
      {
        property: "og:description",
        content: "Create your Blackstar account and deploy your first AI agents in minutes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
