import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/HTMLStudio";

function SpatialPage() {
 return <div className="blackstar-core-page blackstar-audit-page"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/html-studio")({
  head: () => ({
    meta: [
      { title: "HTML Studio — Blackstar" },
      { name: "description", content: "Create and preview standalone HTML artifacts from source material with Blackstar agents." },
      { property: "og:title", content: "HTML Studio — Blackstar" },
      { property: "og:description", content: "Create and preview standalone HTML artifacts from source material with Blackstar agents." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: SpatialPage,
});
