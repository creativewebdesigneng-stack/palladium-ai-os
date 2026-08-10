import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Login";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — PalladiumAI" },
      { name: "description", content: "Sign in to your PalladiumAI workspace and resume your AI workforce." },
      { property: "og:title", content: "Sign in — PalladiumAI" },
      { property: "og:description", content: "Sign in to your PalladiumAI workspace and resume your AI workforce." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
