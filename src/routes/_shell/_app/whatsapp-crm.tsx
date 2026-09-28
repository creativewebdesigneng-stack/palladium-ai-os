import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/WhatsAppCRM";

export const Route = createFileRoute("/_shell/_app/whatsapp-crm")({
  head: () => ({
    meta: [
      { title: "WhatsApp CRM — Blackstar" },
      { name: "description", content: "Shared WhatsApp inbox, CRM-linked conversations and broadcast planning in Blackstar." },
      { property: "og:title", content: "WhatsApp CRM — Blackstar" },
      { property: "og:description", content: "Shared WhatsApp inbox, CRM-linked conversations and broadcast planning in Blackstar." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Screen,
});
