import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/integrations/nango-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { processNangoWebhook, verifyNangoWebhookRequest } =
            await import("@/lib/integrations/nango-webhook.server");
          const payload = await verifyNangoWebhookRequest(request);
          return Response.json(await processNangoWebhook(payload));
        } catch (error) {
          const status =
            typeof error === "object" &&
            error !== null &&
            "status" in error &&
            typeof error.status === "number"
              ? error.status
              : 500;
          console.error("Nango webhook error:", error);
          return Response.json({ accepted: false }, { status });
        }
      },
    },
  },
});
