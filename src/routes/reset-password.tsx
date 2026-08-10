import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/ResetPassword";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — PalladiumAI" },
      { name: "description", content: "Set a new password for your PalladiumAI account." },
      { property: "og:title", content: "Choose a new password — PalladiumAI" },
      { property: "og:description", content: "Set a new password for your PalladiumAI account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
