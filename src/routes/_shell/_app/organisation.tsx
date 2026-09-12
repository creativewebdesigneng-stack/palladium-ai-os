import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Organisation";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-longtail-page blackstar-org"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/organisation")({
  head: () => ({
    meta: [
      { title: "Organisations & Teams — Blackstar" },
      {
        name: "description",
        content:
          "Create shared Blackstar workspaces, invite people, assign owner, admin and member roles, and group them into teams.",
      },
      { property: "og:title", content: "Organisations & Teams — Blackstar" },
      {
        property: "og:description",
        content:
          "Shared AI workforce workspaces with server-enforced roles, seats and permissions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
