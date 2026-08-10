import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Security";

export const Route = createFileRoute("/_shell/_app/security")({
  head: () => ({
    meta: [
      { title: "Security — PalladiumAI" },
      { name: "description", content: "Access, audit and data-protection controls." },
      { property: "og:title", content: "Security — PalladiumAI" },
      { property: "og:description", content: "Access, audit and data-protection controls." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
