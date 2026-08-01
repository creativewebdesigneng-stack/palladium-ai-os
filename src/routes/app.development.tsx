import { createFileRoute } from "@tanstack/react-router";
import { Code2 } from "lucide-react";
import { DepartmentView } from "@/components/os/department-view";

export const Route = createFileRoute("/app/development")({
  head: () => ({
    meta: [
      { title: "Development — PalladiumAI OS" },
      { name: "description", content: "Architecture, code, infrastructure and automations shipped continuously." },
      { property: "og:title", content: "Development — PalladiumAI OS" },
      { property: "og:description", content: "Architecture, code, infrastructure and automations shipped continuously." },
    ],
  }),
  component: () => (
    <DepartmentView
      name="Development"
      icon={Code2}
      summary={"Architecture, code, infrastructure and automations shipped continuously."}
      employees={164}
      missions={14}
      uptime="99.99%"
      load={88}
    />
  ),
});
