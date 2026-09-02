import { createFileRoute } from "@tanstack/react-router";
import { ProviderError, runChat } from "@/lib/runtime/model-gateway.base";

export const Route = createFileRoute("/api/internal/gemini-status-91f4c2a7")({
  server: {
    handlers: {
      GET: async () => {
        if (!process.env["GEMINI_API_KEY"]) return json({ configured: false, ready: false, status: 503 });
        try {
          const result = await runChat({
            provider: "gemini",
            model: "gemini-3.7-flash",
            messages: [{ role: "user", content: "Reply only with OK." }],
            maxTokens: 8,
            timeoutMs: 12000,
          });
          return json({
            configured: true,
            ready: result.text.trim().length > 0,
            status: 200,
            provider: result.provider,
            model: result.model,
          });
        } catch (error) {
          return json({
            configured: true,
            ready: false,
            status: error instanceof ProviderError ? error.status : 500,
          });
        }
      },
    },
  },
});

function json(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
