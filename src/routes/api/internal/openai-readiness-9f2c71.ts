import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/internal/openai-readiness-9f2c71")({
  server: {
    handlers: {
      GET: async () => {
        const key = process.env["OPENAI_API_KEY"]?.trim();
        if (!key) return json({ configured: false, ready: false, status: null });

        try {
          const response = await fetch("https://api.openai.com/v1/models", {
            method: "GET",
            headers: { Authorization: `Bearer ${key}` },
            redirect: "error",
            signal: AbortSignal.timeout(10_000),
          });
          return json({ configured: true, ready: response.ok, status: response.status });
        } catch {
          return json({ configured: true, ready: false, status: null });
        }
      },
    },
  },
});

function json(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
