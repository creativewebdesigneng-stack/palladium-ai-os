import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/CRM";

function SpatialPage() {
 return <div className="blackstar-core-page blackstar-audit-page"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/crm")({
  head: () => ({
    meta: [
      { title: "CRM — Blackstar" },
      { name: "description", content: "Pipeline, contacts and AI-run follow-up." },
      { property: "og:title", content: "CRM — Blackstar" },
      { property: "og:description", content: "Pipeline, contacts and AI-run follow-up." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
