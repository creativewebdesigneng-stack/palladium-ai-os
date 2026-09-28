import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/ResetPassword";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — Blackstar" },
      { name: "description", content: "Set a new password for your Blackstar account." },
      { property: "og:title", content: "Choose a new password — Blackstar" },
      { property: "og:description", content: "Set a new password for your Blackstar account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
