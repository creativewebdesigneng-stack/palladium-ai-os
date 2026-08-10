import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AdminSecurity";

export const Route = createFileRoute("/_shell/_app/admin/security")({
  head: () => ({
    meta: [
      { title: "Admin · Security — PalladiumAI" },
      { name: "description", content: "Security posture and policy enforcement." },
      { property: "og:title", content: "Admin · Security — PalladiumAI" },
      { property: "og:description", content: "Security posture and policy enforcement." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
