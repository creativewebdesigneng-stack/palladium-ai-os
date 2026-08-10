import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Billing";

export const Route = createFileRoute("/_shell/_app/billing")({
  head: () => ({
    meta: [
      { title: "Billing — PalladiumAI" },
      { name: "description", content: "Plan, usage and invoices." },
      { property: "og:title", content: "Billing — PalladiumAI" },
      { property: "og:description", content: "Plan, usage and invoices." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
