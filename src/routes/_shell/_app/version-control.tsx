import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/GitControl";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-final-page blackstar-dev-detail"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/version-control")({
  head: () => ({
    meta: [
      { title: "Version control — Blackstar" },
      { name: "description", content: "Source-control provider integration status for Blackstar." },
      { property: "og:title", content: "Version control — Blackstar" },
      {
        property: "og:description",
        content: "Source-control provider integration status for Blackstar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
