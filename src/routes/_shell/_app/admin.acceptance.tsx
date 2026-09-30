import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AdminAcceptance";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-admin"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/admin/acceptance")({
  head: () => ({
    meta: [
      { title: "Operational Acceptance — Blackstar" },
      { name: "description", content: "Blackstar real-world acceptance and certification control plane." },
      { property: "og:title", content: "Operational Acceptance — Blackstar" },
      { property: "og:description", content: "Blackstar real-world acceptance and certification control plane." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
