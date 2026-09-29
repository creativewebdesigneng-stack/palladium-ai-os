import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Legal";

export const Route = createFileRoute("/legal/$slug")({
  head: () => ({
    meta: [
      { title: "Legal drafts — Blackstar" },
      {
        name: "description",
        content: "Draft Blackstar legal and policy pages awaiting formal review. These documents are not yet in force.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Legal drafts — Blackstar" },
      {
        property: "og:description",
        content: "Draft Blackstar legal and policy pages awaiting formal review. These documents are not yet in force.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
