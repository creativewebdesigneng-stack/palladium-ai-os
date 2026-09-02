import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/internal/gemini-status-91f4c2a7")({
  server: {
    handlers: {
      GET: async () => {
        const key = process.env["GEMINI_API_KEY"];
        if (!key) return json({ configured: false, keyReady: false, models: [] });
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}&pageSize=1000`, {
            signal: AbortSignal.timeout(10000),
          });
          if (!res.ok) return json({ configured: true, keyReady: false, status: res.status, models: [] });
          const body = (await res.json()) as {
            models?: Array<{ name?: unknown; supportedGenerationMethods?: unknown }>;
          };
          const models = (body.models ?? [])
            .filter((model) => {
              const name = typeof model.name === "string" ? model.name.toLowerCase() : "";
              const methods = Array.isArray(model.supportedGenerationMethods) ? model.supportedGenerationMethods : [];
              return name.includes("gemini") && name.includes("flash") && methods.includes("generateContent");
            })
            .map((model) => (typeof model.name === "string" ? model.name.replace(/^models\//, "") : ""))
            .filter(Boolean)
            .slice(0, 30);
          return json({ configured: true, keyReady: true, status: 200, models });
        } catch {
          return json({ configured: true, keyReady: false, status: 504, models: [] });
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
