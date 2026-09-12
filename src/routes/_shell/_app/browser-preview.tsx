import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/BrowserPreview";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-audit-page"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/browser-preview")({
  head: () => ({
    meta: [
      { title: "Browser preview — Blackstar" },
      { name: "description", content: "Browser preview setup and runtime requirements." },
      { property: "og:title", content: "Browser preview — Blackstar" },
      { property: "og:description", content: "Browser preview setup and runtime requirements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
