import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/PhoneCommunications";

export const Route = createFileRoute("/_shell/_app/phone-communications")({
  head: () => ({
    meta: [
      { title: "Phone & Voice — Blackstar" },
      { name: "description", content: "Configure Blackstar phone notifications, SMS and AI voice calls." },
      { property: "og:title", content: "Phone & Voice — Blackstar" },
      { property: "og:description", content: "Configure Blackstar phone notifications, SMS and AI voice calls." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
