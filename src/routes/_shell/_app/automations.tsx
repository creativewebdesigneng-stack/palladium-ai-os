import { createFileRoute } from "@tanstack/react-router";
import ModulePage from "@/screens/ModulePage";

export const Route = createFileRoute("/_shell/_app/automations")({
  head: () => ({
    meta: [
      { title: "Automations — PalladiumAI" },
      { name: "description", content: "Every automation running in your workspace." },
      { property: "og:title", content: "Automations — PalladiumAI" },
      { property: "og:description", content: "Every automation running in your workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <ModulePage type="automations" />,
});
