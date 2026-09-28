import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Legal";

export const Route = createFileRoute("/legal/$slug")({
  head: () => ({
    meta: [
      { title: "Legal — Blackstar" },
      {
        name: "description",
        content: "Terms of service, privacy, security and AI safety policies for Blackstar.",
      },
      { property: "og:title", content: "Legal — Blackstar" },
      {
        property: "og:description",
        content: "Terms of service, privacy, security and AI safety policies for Blackstar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
