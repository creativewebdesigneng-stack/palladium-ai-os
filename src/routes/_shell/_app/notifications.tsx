import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Notifications";

export const Route = createFileRoute("/_shell/_app/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Blackstar" },
      { name: "description", content: "Approvals and events from your workforce." },
      { property: "og:title", content: "Notifications — Blackstar" },
      { property: "og:description", content: "Approvals and events from your workforce." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
