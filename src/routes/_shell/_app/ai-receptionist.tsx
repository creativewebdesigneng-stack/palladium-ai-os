import { createFileRoute } from "@tanstack/react-router";
import AIReceptionistHub from "@/screens/AIReceptionistHub";

export const Route = createFileRoute("/_shell/_app/ai-receptionist")({
  head: () => ({
    meta: [
      { title: "AI Receptionist — Blackstar" },
      {
        name: "description",
        content:
          "Retail receptionist answers and Twilio readiness. This hub does not place calls or send messages.",
      },
    ],
  }),
  component: AIReceptionistHub,
});
