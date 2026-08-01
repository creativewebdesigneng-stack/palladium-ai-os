import { createFileRoute } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { DepartmentView } from "@/components/os/department-view";

export const Route = createFileRoute("/app/health")({
  head: () => ({
    meta: [
      { title: "Health — PalladiumAI OS" },
      { name: "description", content: "Calories, water, weight, sleep, training, meal planning and gym scheduling with a dedicated coach." },
      { property: "og:title", content: "Health — PalladiumAI OS" },
      { property: "og:description", content: "Calories, water, weight, sleep, training, meal planning and gym scheduling with a dedicated coach." },
    ],
  }),
  component: () => (
    <DepartmentView
      name="Health"
      icon={Heart}
      summary={"Calories, water, weight, sleep, training, meal planning and gym scheduling with a dedicated coach."}
      employees={44}
      missions={5}
      uptime="99.99%"
      load={38}
    />
  ),
});
