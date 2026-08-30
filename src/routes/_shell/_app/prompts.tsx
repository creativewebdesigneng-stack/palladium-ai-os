import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/PromptWorkspace";

export const Route = createFileRoute("/_shell/_app/prompts")({
  head: () => ({
    meta: [
      { title: "Prompts — PalladiumAI" },
      { name: "description", content: "Save, version and run reusable prompts, including the audited Seedream production prompt pack." },
      { property: "og:title", content: "Prompts — PalladiumAI" },
      {
        property: "og:description",
        content: "Save, version and run reusable prompts, including the audited Seedream production prompt pack.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
