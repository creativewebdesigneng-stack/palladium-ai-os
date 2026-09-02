import { createFileRoute } from "@tanstack/react-router";
import { getProviderOptions } from "@/lib/ai/ai-preferences.server";
import {
  ProviderError,
  runChat as runProviderChat,
  type Provider,
} from "@/lib/runtime/model-gateway.base";

/** Temporary production readiness probe. Contains and returns no secret values. */
export const Route = createFileRoute("/api/internal/provider-readiness-7f3c2a9e")({
  server: {
    handlers: {
      GET: async () => {
        const providers = getProviderOptions();
        const results: Array<{
          id: Provider;
          configured: boolean;
          ready: boolean;
          status: number | null;
          code: string;
        }> = [];

        for (const option of providers) {
          if (!option.configured) {
            results.push({ id: option.id, configured: false, ready: false, status: null, code: "NOT_CONFIGURED" });
            continue;
          }
          try {
            await runProviderChat({
              provider: option.id,
              model: option.defaultModel,
              messages: [{ role: "user", content: "Reply with exactly OK." }],
              temperature: 0,
              maxTokens: 8,
              timeoutMs: 8_000,
            });
            results.push({ id: option.id, configured: true, ready: true, status: 200, code: "READY" });
          } catch (error) {
            const status = error instanceof ProviderError ? error.status : 500;
            let code = "PROVIDER_ERROR";
            if (status === 402) code = "CREDITS_EXHAUSTED";
            else if (status === 429) code = "RATE_LIMITED";
            else if (status === 401 || status === 403) code = "CREDENTIAL_REJECTED";
            else if (status === 503) code = "UNAVAILABLE";
            else if (status === 504) code = "TIMEOUT";
            results.push({ id: option.id, configured: true, ready: false, status, code });
          }
        }

        return new Response(JSON.stringify({ providers: results }), {
          status: 200,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
        });
      },
    },
  },
});
