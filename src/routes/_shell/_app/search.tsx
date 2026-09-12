import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Research";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-longtail-page blackstar-research"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/search")({
  head: () => ({
    meta: [
      { title: "Research — Blackstar" },
      { name: "description", content: "Research provider setup and citation requirements." },
      { property: "og:title", content: "Research — Blackstar" },
      { property: "og:description", content: "Research provider setup and citation requirements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
