import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/ServerError";

export const Route = createFileRoute("/500")({
  head: () => ({
    meta: [
      { title: "Something went wrong — PalladiumAI" },
      { name: "description", content: "An unexpected error occurred. Our systems are on it." },
      { property: "og:title", content: "Something went wrong — PalladiumAI" },
      { property: "og:description", content: "An unexpected error occurred. Our systems are on it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
