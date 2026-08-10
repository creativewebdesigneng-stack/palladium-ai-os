import { createFileRoute } from "@tanstack/react-router";
import AppShell from "@/components/palladium/AppShell";

export const Route = createFileRoute("/_shell/_app")({
  component: AppShell,
});
