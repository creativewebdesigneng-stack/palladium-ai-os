import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AuditLogs";

export const Route = createFileRoute("/_shell/_app/admin/audit-logs")({
  head: () => ({
    meta: [
      { title: "Admin · Audit logs — PalladiumAI" },
      { name: "description", content: "Every privileged action, recorded." },
      { property: "og:title", content: "Admin · Audit logs — PalladiumAI" },
      { property: "og:description", content: "Every privileged action, recorded." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
