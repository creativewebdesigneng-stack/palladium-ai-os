import { createFileRoute } from "@tanstack/react-router";
import ModulePage from "@/screens/ModulePage";

export const Route = createFileRoute("/_shell/_app/developer")({
  head: () => ({
    meta: [
      { title: "Developer — PalladiumAI" },
      { name: "description", content: "Developer surface for your AI workforce." },
      { property: "og:title", content: "Developer — PalladiumAI" },
      { property: "og:description", content: "Developer surface for your AI workforce." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <ModulePage type="developer" />,
});
