import { createFileRoute } from "@tanstack/react-router";
import { Brain } from "lucide-react";
import { DepartmentView } from "@/components/os/department-view";

export const Route = createFileRoute("/app/memory")({
  head: () => ({
    meta: [
      { title: "Memory — PalladiumAI OS" },
      { name: "description", content: "The shared long-term memory your entire workforce reads from and writes to." },
      { property: "og:title", content: "Memory — PalladiumAI OS" },
      { property: "og:description", content: "The shared long-term memory your entire workforce reads from and writes to." },
    ],
  }),
  component: () => (
    <DepartmentView
      name="Memory"
      icon={Brain}
      summary={"The shared long-term memory your entire workforce reads from and writes to."}
      employees={12}
      missions={2}
      uptime="99.99%"
      load={57}
    />
  ),
});
