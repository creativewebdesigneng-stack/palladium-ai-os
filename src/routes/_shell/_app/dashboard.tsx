import { createFileRoute } from "@tanstack/react-router";
import PlatformAnnouncement from "@/components/palladium/PlatformAnnouncement";
import DashboardWidgets from "@/components/dashboard/DashboardWidgets";
import { useAuth } from "@/lib/AuthContext";
import Screen from "@/screens/Dashboard";

function DashboardRoute() {
  const { isAuthenticated } = useAuth();
  return (
    <>
      <PlatformAnnouncement />
      <Screen />
      <DashboardWidgets enabled={isAuthenticated} />
    </>
  );
}

export const Route = createFileRoute("/_shell/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — PalladiumAI" },
      {
        name: "description",
        content: "Your AI workforce at a glance: live missions, agents and outcomes.",
      },
      { property: "og:title", content: "Dashboard — PalladiumAI" },
      {
        property: "og:description",
        content: "Your AI workforce at a glance: live missions, agents and outcomes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardRoute,
});
