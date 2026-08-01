import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";
import { DepartmentView } from "@/components/os/department-view";

export const Route = createFileRoute("/app/sales")({
  head: () => ({
    meta: [
      { title: "Sales — PalladiumAI OS" },
      { name: "description", content: "Pipeline generation, outbound sequences, demos and closing support." },
      { property: "og:title", content: "Sales — PalladiumAI OS" },
      { property: "og:description", content: "Pipeline generation, outbound sequences, demos and closing support." },
    ],
  }),
  component: () => (
    <DepartmentView
      name="Sales"
      icon={TrendingUp}
      summary={"Pipeline generation, outbound sequences, demos and closing support."}
      employees={71}
      missions={7}
      uptime="99.9%"
      load={69}
    />
  ),
});
