import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Security";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-longtail-page blackstar-security"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/security")({
  head: () => ({
    meta: [
      { title: "Security — Blackstar" },
      { name: "description", content: "Access, audit and data-protection controls." },
      { property: "og:title", content: "Security — Blackstar" },
      { property: "og:description", content: "Access, audit and data-protection controls." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
