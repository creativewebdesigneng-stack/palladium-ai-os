import { createFileRoute } from "@tanstack/react-router";
import { Plane } from "lucide-react";
import { DepartmentView } from "@/components/os/department-view";

export const Route = createFileRoute("/app/travel")({
  head: () => ({
    meta: [
      { title: "Travel — PalladiumAI OS" },
      { name: "description", content: "Itineraries, bookings, visas and live trip operations handled end to end." },
      { property: "og:title", content: "Travel — PalladiumAI OS" },
      { property: "og:description", content: "Itineraries, bookings, visas and live trip operations handled end to end." },
    ],
  }),
  component: () => (
    <DepartmentView
      name="Travel"
      icon={Plane}
      summary={"Itineraries, bookings, visas and live trip operations handled end to end."}
      employees={22}
      missions={2}
      uptime="99.92%"
      load={19}
    />
  ),
});
