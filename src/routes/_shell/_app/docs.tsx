import { createFileRoute } from "@tanstack/react-router";
import ModulePage from "@/screens/ModulePage";

export const Route = createFileRoute("/_shell/_app/docs")({
  head: () => ({
    meta: [
      { title: "Docs — PalladiumAI" },
      { name: "description", content: "Documentation for your workspace and agents." },
      { property: "og:title", content: "Docs — PalladiumAI" },
      { property: "og:description", content: "Documentation for your workspace and agents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <ModulePage type="docs" />,
});
