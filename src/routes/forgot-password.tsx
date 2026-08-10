import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/ForgotPassword";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — PalladiumAI" },
      {
        name: "description",
        content: "Request a secure password reset link for your PalladiumAI account.",
      },
      { property: "og:title", content: "Reset password — PalladiumAI" },
      {
        property: "og:description",
        content: "Request a secure password reset link for your PalladiumAI account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
