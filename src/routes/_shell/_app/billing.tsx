import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Billing";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-secondary-page blackstar-billing"><Screen /></div>;
}

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-secondary-page blackstar-billing"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/billing")({
  head: () => ({
    meta: [
      { title: "Billing — Blackstar" },
      { name: "description", content: "Plan, usage and invoices." },
      { property: "og:title", content: "Billing — Blackstar" },
      { property: "og:description", content: "Plan, usage and invoices." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
