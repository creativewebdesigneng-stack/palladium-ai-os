import { createFileRoute } from "@tanstack/react-router";
import { Target } from "lucide-react";
import { DepartmentView } from "@/components/os/department-view";

export const Route = createFileRoute("/app/business")({
  head: () => ({
    meta: [
      { title: "Business — PalladiumAI OS" },
      { name: "description", content: "Company formation, operations, hiring and growth engines for every business you own." },
      { property: "og:title", content: "Business — PalladiumAI OS" },
      { property: "og:description", content: "Company formation, operations, hiring and growth engines for every business you own." },
    ],
  }),
  component: () => (
    <DepartmentView
      name="Business"
      icon={Target}
      summary={"Company formation, operations, hiring and growth engines for every business you own."}
      employees={148}
      missions={12}
      uptime="99.98%"
      load={72}
    />
  ),
});
