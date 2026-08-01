import { createFileRoute, notFound } from "@tanstack/react-router";
import { DepartmentView } from "@/components/os/department-view";
import { departments } from "@/lib/os-data";

export const Route = createFileRoute("/app/departments/$slug")({
  head: () => ({
    meta: [
      { title: "Department — PalladiumAI OS" },
      {
        name: "description",
        content:
          "Department control surface: overview, tasks, employees, analytics, goals, automations and mission templates.",
      },
      { property: "og:title", content: "Department — PalladiumAI OS" },
      {
        property: "og:description",
        content: "Run a full AI department with its own roster, goals and automations.",
      },
    ],
  }),
  component: DepartmentPage,
});

function DepartmentPage() {
  const { slug } = Route.useParams();
  const dept = departments.find((d) => d.slug === slug);

  if (!dept) throw notFound();

  return (
    <DepartmentView
      name={dept.name}
      icon={dept.icon}
      summary={dept.summary}
      employees={dept.employees}
      missions={dept.missions}
      uptime={dept.uptime}
      load={dept.load}
    />
  );
}
