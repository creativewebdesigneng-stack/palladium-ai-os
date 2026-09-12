import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Finance";


function SpatialPage() {
  return <div className="blackstar-core-page blackstar-finance"><Screen /></div>;
}
export const Route = createFileRoute("/_shell/_app/finance")({
  head: () => ({
    meta: [
      { title: "Finance — Blackstar" },
      { name: "description", content: "Cashflow, invoices and forecasting with AI." },
      { property: "og:title", content: "Finance — Blackstar" },
      { property: "og:description", content: "Cashflow, invoices and forecasting with AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
