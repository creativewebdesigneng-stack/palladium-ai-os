import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/GameFoundry";


function SpatialPage() {
  return <div className="blackstar-core-page blackstar-game"><Screen /></div>;
}
export const Route = createFileRoute("/_shell/_app/game-foundry")({
  head: () => ({
    meta: [
      { title: "Blackstar Game Foundry" },
      { name: "description", content: "Generate game-ready 3D assets and game projects from prompts, images and existing models." },
    ],
  }),
  component: SpatialPage,
});
