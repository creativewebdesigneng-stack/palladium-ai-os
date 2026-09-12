import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Finance";


function SpatialPage() {
  return <div className="blackstar-core-page blackstar-finance"><Screen /></div>;
}
export const Route = createFileRoute("/_shell/_app/finance")({
  head: () => ({
    meta: [
      { title: "Finance Hub — Blackstar" },
      { name: "description", content: "Ledger, planning calculators, personal and business finance education, and trusted financial resources." },
      { property: "og:title", content: "Finance Hub — Blackstar" },
      { property: "og:description", content: "Ledger, planning calculators, personal and business finance education, and trusted financial resources." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
