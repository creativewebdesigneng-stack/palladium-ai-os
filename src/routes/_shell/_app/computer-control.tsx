import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/ComputerControl";

function SpatialPage() {
 return <div className="blackstar-core-page blackstar-audit-page"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/computer-control")({
  head: () => ({
    meta: [
      { title: "Computer control — Blackstar" },
      { name: "description", content: "Let agents operate a browser and desktop safely." },
      { property: "og:title", content: "Computer control — Blackstar" },
      { property: "og:description", content: "Let agents operate a browser and desktop safely." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
