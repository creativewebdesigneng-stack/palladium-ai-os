import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Admin";


function SpatialPage() {
  return <div className="blackstar-core-page blackstar-admin"><Screen /></div>;
}
export const Route = createFileRoute("/_shell/_app/admin/")({
  head: () => ({
    meta: [
      { title: "Admin — Blackstar" },
      { name: "description", content: "Platform administration overview." },
      { property: "og:title", content: "Admin — Blackstar" },
      { property: "og:description", content: "Platform administration overview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
