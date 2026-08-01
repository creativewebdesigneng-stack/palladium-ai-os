import { createFileRoute } from "@tanstack/react-router";
import { Calendar } from "lucide-react";
import { DepartmentView } from "@/components/os/department-view";

export const Route = createFileRoute("/app/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — PalladiumAI OS" },
      { name: "description", content: "Your time, defended. Agents schedule, reschedule and prepare you for everything on the docket." },
      { property: "og:title", content: "Calendar — PalladiumAI OS" },
      { property: "og:description", content: "Your time, defended. Agents schedule, reschedule and prepare you for everything on the docket." },
    ],
  }),
  component: () => (
    <DepartmentView
      name="Calendar"
      icon={Calendar}
      summary={"Your time, defended. Agents schedule, reschedule and prepare you for everything on the docket."}
      employees={21}
      missions={3}
      uptime="99.98%"
      load={31}
    />
  ),
});
