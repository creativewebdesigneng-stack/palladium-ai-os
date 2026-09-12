import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AdminSecurity";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-final-page blackstar-admin-detail"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/admin/security")({
  head: () => ({
    meta: [
      { title: "Admin · Security — Blackstar" },
      { name: "description", content: "Security posture and policy enforcement." },
      { property: "og:title", content: "Admin · Security — Blackstar" },
      { property: "og:description", content: "Security posture and policy enforcement." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
