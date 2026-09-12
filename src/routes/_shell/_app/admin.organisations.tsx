import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AdminOrganisations";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-final-page blackstar-admin-detail"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/admin/organisations")({
  head: () => ({
    meta: [
      { title: "Admin · Organisations — Blackstar" },
      { name: "description", content: "Manage tenants and organisations." },
      { property: "og:title", content: "Admin · Organisations — Blackstar" },
      { property: "og:description", content: "Manage tenants and organisations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
