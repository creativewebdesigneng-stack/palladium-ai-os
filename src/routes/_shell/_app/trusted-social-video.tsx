import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/TrustedSocialVideo";

export const Route = createFileRoute("/_shell/_app/trusted-social-video")({
  head: () => ({
    meta: [
      { title: "Trusted Social Video — Blackstar" },
      { name: "description", content: "Upload and verify private video assets for governed TikTok and YouTube publishing in Blackstar." },
      { property: "og:title", content: "Trusted Social Video — Blackstar" },
      { property: "og:description", content: "Upload and verify private video assets for governed TikTok and YouTube publishing in Blackstar." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Screen,
});
