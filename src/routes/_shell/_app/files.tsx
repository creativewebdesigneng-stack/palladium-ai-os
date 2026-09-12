import { createFileRoute } from "@tanstack/react-router";
import type React from "react";
import Screen from "@/screens/Files";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-secondary-page blackstar-files"><Screen /></div>;
}

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-secondary-page blackstar-files"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/files")({
  head: () => ({
    meta: [
      { title: "Files — Blackstar" },
      { name: "description", content: "Every file your workforce creates or uses." },
      { property: "og:title", content: "Files — Blackstar" },
      { property: "og:description", content: "Every file your workforce creates or uses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
