import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AuditLogs";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-final-page blackstar-admin-detail"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/admin/audit-logs")({
  head: () => ({
    meta: [
      { title: "Admin · Audit logs — Blackstar" },
      { name: "description", content: "Every privileged action, recorded." },
      { property: "og:title", content: "Admin · Audit logs — Blackstar" },
      { property: "og:description", content: "Every privileged action, recorded." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
