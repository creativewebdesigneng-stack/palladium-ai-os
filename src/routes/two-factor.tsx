import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/TwoFactor";

export const Route = createFileRoute("/two-factor")({
  head: () => ({
    meta: [
      { title: "Two-factor status — Blackstar" },
      {
        name: "description",
        content: "This deployment does not expose a standalone Blackstar MFA verifier on this route.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Two-factor status — Blackstar" },
      {
        property: "og:description",
        content: "This deployment does not expose a standalone Blackstar MFA verifier on this route.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen,
});
