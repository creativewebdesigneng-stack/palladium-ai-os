import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Finance";

export const Route = createFileRoute("/_shell/_app/finance")({
  head: () => ({
    meta: [
      { title: "Finance — PalladiumAI" },
      { name: "description", content: "Cashflow, invoices and forecasting with AI." },
      { property: "og:title", content: "Finance — PalladiumAI" },
      { property: "og:description", content: "Cashflow, invoices and forecasting with AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
