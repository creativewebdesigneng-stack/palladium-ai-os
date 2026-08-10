import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AdminSubscriptions";

export const Route = createFileRoute("/_shell/_app/admin/subscriptions")({
  head: () => ({
    meta: [
      { title: "Admin · Subscriptions — PalladiumAI" },
      { name: "description", content: "Plans, entitlements and renewals." },
      { property: "og:title", content: "Admin · Subscriptions — PalladiumAI" },
      { property: "og:description", content: "Plans, entitlements and renewals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
