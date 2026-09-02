import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/internal/openai-status-4d2a7c11")({
  server: {
    handlers: {
      GET: async () => {
        const key = process.env["OPENAI_API_KEY"];
        if (!key) return json({ configured: false, status: null, type: null, code: "NOT_CONFIGURED" });
        try {
          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "gpt-4.1-mini", messages: [{ role: "user", content: "Reply OK." }], max_tokens: 4 }),
            signal: AbortSignal.timeout(8000),
          });
          if (res.ok) return json({ configured: true, status: 200, type: null, code: "READY" });
          let type: string | null = null;
          let code: string | null = null;
          try {
            const body = await res.json() as { error?: { type?: unknown; code?: unknown } };
            type = typeof body.error?.type === "string" ? body.error.type.slice(0, 80) : null;
            code = typeof body.error?.code === "string" ? body.error.code.slice(0, 80) : null;
          } catch {}
          return json({ configured: true, status: res.status, type, code });
        } catch {
          return json({ configured: true, status: 504, type: "timeout", code: "TIMEOUT" });
        }
      },
    },
  },
});

function json(payload: unknown) {
  return new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
