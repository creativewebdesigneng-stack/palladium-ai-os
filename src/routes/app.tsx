import { createFileRoute } from "@tanstack/react-router";
import { OsShell } from "@/components/os/os-shell";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "PalladiumAI OS — Operate your AI workforce" },
      {
        name: "description",
        content:
          "The PalladiumAI operating system: mission control, departments, AI workforce, analytics and integrations in one command surface.",
      },
      { property: "og:title", content: "PalladiumAI OS — Operate your AI workforce" },
      {
        property: "og:description",
        content: "Mission control for thousands of AI workers completing missions on your behalf.",
      },
    ],
  }),
  component: AppLayout,
});

function AppLayout() {
  return <OsShell />;
}
