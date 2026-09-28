import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/ForgotPassword";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Blackstar" },
      {
        name: "description",
        content: "Request a secure password reset link for your Blackstar account.",
      },
      { property: "og:title", content: "Reset password — Blackstar" },
      {
        property: "og:description",
        content: "Request a secure password reset link for your Blackstar account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
