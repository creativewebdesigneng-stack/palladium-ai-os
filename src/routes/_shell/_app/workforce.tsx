import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Workforce";

export const Route = createFileRoute("/_shell/_app/workforce")({
  head: () => ({
    meta: [
      { title: "Workforce OS — Blackstar" },
      { name: "description", content: "Operate and govern Blackstar AI workforces, autonomous fleet assignments, passports, delegations and durable execution." },
      { property: "og:title", content: "Workforce OS — Blackstar" },
      { property: "og:description", content: "Operate and govern Blackstar AI workforces, autonomous fleet assignments, passports, delegations and durable execution." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
