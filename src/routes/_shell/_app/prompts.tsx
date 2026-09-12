import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/PromptWorkspace";

function SpatialPage() {
  return <div className="blackstar-core-page blackstar-final-page blackstar-dev-detail"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/prompts")({
  head: () => ({
    meta: [
      { title: "Prompts — Blackstar" },
      { name: "description", content: "Save, version and run reusable prompts, including the audited Seedream production prompt pack." },
      { property: "og:title", content: "Prompts — Blackstar" },
      {
        property: "og:description",
        content: "Save, version and run reusable prompts, including the audited Seedream production prompt pack.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpatialPage,
});
