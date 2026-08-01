import { createFileRoute } from "@tanstack/react-router";
import { Palette } from "lucide-react";
import { DepartmentView } from "@/components/os/department-view";

export const Route = createFileRoute("/app/creative-studio")({
  head: () => ({
    meta: [
      { title: "Creative Studio — PalladiumAI OS" },
      { name: "description", content: "Brand identity, video, design and copy production at studio quality." },
      { property: "og:title", content: "Creative Studio — PalladiumAI OS" },
      { property: "og:description", content: "Brand identity, video, design and copy production at studio quality." },
    ],
  }),
  component: () => (
    <DepartmentView
      name="Creative Studio"
      icon={Palette}
      summary={"Brand identity, video, design and copy production at studio quality."}
      employees={88}
      missions={9}
      uptime="99.94%"
      load={81}
    />
  ),
});
