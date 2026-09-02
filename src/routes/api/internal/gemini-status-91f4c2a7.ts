import { createFileRoute } from "@tanstack/react-router";
import { ProviderError, runChat } from "@/lib/runtime/model-gateway.base";

export const Route = createFileRoute("/api/internal/gemini-status-91f4c2a7")({
  server: {
    handlers: {
      GET: async () => {
        const key = process.env["GEMINI_API_KEY"];
        if (!key) return json({ configured: false, keyReady: false, generationReady: false, status: 503 });

        let keyReady = false;
        let keyStatus = 500;
        try {
          const models = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`, {
            signal: AbortSignal.timeout(8000),
          });
          keyStatus = models.status;
          keyReady = models.ok;
        } catch {
          keyStatus = 504;
        }

        if (!keyReady) return json({ configured: true, keyReady: false, generationReady: false, status: keyStatus });

        try {
          const result = await runChat({
            provider: "gemini",
            model: "gemini-2.5-flash",
            messages: [{ role: "user", content: "Reply only with OK." }],
            maxTokens: 8,
            timeoutMs: 20000,
          });
          return json({
            configured: true,
            keyReady: true,
            generationReady: result.text.trim().length > 0,
            status: 200,
            provider: result.provider,
            model: result.model,
          });
        } catch (error) {
          return json({
            configured: true,
            keyReady: true,
            generationReady: false,
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
