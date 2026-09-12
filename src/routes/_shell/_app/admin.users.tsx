import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AdminUsers";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-final-page blackstar-admin-detail"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/admin/users")({
  head: () => ({
    meta: [
      { title: "Admin · Users — Blackstar" },
      { name: "description", content: "Manage platform users and access." },
      { property: "og:title", content: "Admin · Users — Blackstar" },
      { property: "og:description", content: "Manage platform users and access." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
