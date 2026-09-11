import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/GameFoundry";

export const Route = createFileRoute("/_shell/_app/game-foundry")({
  head: () => ({
    meta: [
      { title: "Blackstar Game Foundry" },
      { name: "description", content: "Generate game-ready 3D assets and game projects from prompts, images and existing models." },
    ],
  }),
  component: Screen,
});
