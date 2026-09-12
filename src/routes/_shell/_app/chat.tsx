import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Chat";

function SpatialPage() {
 return <div className="blackstar-core-page blackstar-audit-page"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/chat")({
  head: () => ({
    meta: [
      { title: "Chat — Blackstar" },
      { name: "description", content: "Talk to your agents with full context, tools and memory." },
      { property: "og:title", content: "Chat — Blackstar" },
      {
        property: "og:description",
        content: "Talk to your agents with full context, tools and memory.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
