import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Login";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex,nofollow" },
      { title: "Sign in — Blackstar" },
      {
        name: "description",
        content: "Sign in to your Blackstar workspace and resume your AI workforce.",
      },
      { property: "og:title", content: "Sign in — Blackstar" },
      {
        property: "og:description",
        content: "Sign in to your Blackstar workspace and resume your AI workforce.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
