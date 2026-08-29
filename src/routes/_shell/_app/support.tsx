import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/CustomerSupportWorkspace";

export const Route = createFileRoute("/_shell/_app/support")({
  head: () => ({
    meta: [
      { title: "Customer support — PalladiumAI" },
      { name: "description", content: "Resolve omnichannel support tickets with agents, CRM context, help content and human escalation." },
      { property: "og:title", content: "Customer support — PalladiumAI" },
      { property: "og:description", content: "Resolve omnichannel support tickets with agents, CRM context, help content and human escalation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
