import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Terminal";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-final-page blackstar-dev-detail"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/terminal")({
  head: () => ({
    meta: [
      { title: "Terminal — Blackstar" },
      { name: "description", content: "View the current Blackstar secure execution availability and sandbox requirements." },
      { property: "og:title", content: "Terminal — Blackstar" },
      { property: "og:description", content: "View the current Blackstar secure execution availability and sandbox requirements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
