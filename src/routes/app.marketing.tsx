import { createFileRoute } from "@tanstack/react-router";
import { Megaphone } from "lucide-react";
import { DepartmentView } from "@/components/os/department-view";

export const Route = createFileRoute("/app/marketing")({
  head: () => ({
    meta: [
      { title: "Marketing — PalladiumAI OS" },
      { name: "description", content: "Demand generation across paid, organic, lifecycle and social — planned, produced and optimised." },
      { property: "og:title", content: "Marketing — PalladiumAI OS" },
      { property: "og:description", content: "Demand generation across paid, organic, lifecycle and social — planned, produced and optimised." },
    ],
  }),
  component: () => (
    <DepartmentView
      name="Marketing"
      icon={Megaphone}
      summary={"Demand generation across paid, organic, lifecycle and social — planned, produced and optimised."}
      employees={97}
      missions={11}
      uptime="99.93%"
      load={76}
    />
  ),
});
