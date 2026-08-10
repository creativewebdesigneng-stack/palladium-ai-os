import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/AdminOrganisations";

export const Route = createFileRoute("/_shell/_app/admin/organisations")({
  head: () => ({
    meta: [
      { title: "Admin · Organisations — PalladiumAI" },
      { name: "description", content: "Manage tenants and organisations." },
      { property: "og:title", content: "Admin · Organisations — PalladiumAI" },
      { property: "og:description", content: "Manage tenants and organisations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
