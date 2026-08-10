import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/CRM";

export const Route = createFileRoute("/_shell/_app/crm")({
  head: () => ({
    meta: [
      { title: "CRM — PalladiumAI" },
      { name: "description", content: "Pipeline, contacts and AI-run follow-up." },
      { property: "og:title", content: "CRM — PalladiumAI" },
      { property: "og:description", content: "Pipeline, contacts and AI-run follow-up." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
