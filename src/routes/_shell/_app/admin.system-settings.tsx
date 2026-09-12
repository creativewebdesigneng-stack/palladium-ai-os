import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AdminSystemSettings";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-final-page blackstar-admin-detail"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/admin/system-settings")({
  head: () => ({
    meta: [
      { title: "Admin · System settings — Blackstar" },
      { name: "description", content: "Platform-wide configuration." },
      { property: "og:title", content: "Admin · System settings — Blackstar" },
      { property: "og:description", content: "Platform-wide configuration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
