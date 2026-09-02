import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/internal/gemini-status-91f4c2a7")({
  server: {
    handlers: {
      GET: async () => {
        const key = process.env["GEMINI_API_KEY"];
        if (!key) return json({ configured: false, ready: false, status: 503 });
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Reply only with OK." }] }] }),
              signal: AbortSignal.timeout(20000),
            },
          );
          if (!res.ok) {
            let errorStatus: string | null = null;
            let errorMessage: string | null = null;
            try {
              const body = (await res.json()) as { error?: { status?: unknown; message?: unknown } };
              errorStatus = typeof body.error?.status === "string" ? body.error.status.slice(0, 80) : null;
              errorMessage = typeof body.error?.message === "string" ? body.error.message.slice(0, 240) : null;
            } catch {}
            return json({ configured: true, ready: false, status: res.status, errorStatus, errorMessage });
          }
          const body = (await res.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
          };
          const text = body.candidates?.[0]?.content?.parts
            ?.map((part) => (typeof part.text === "string" ? part.text : ""))
            .join("")
            .trim();
          return json({ configured: true, ready: Boolean(text), status: 200, model: "gemini-2.5-flash" });
        } catch {
          return json({ configured: true, ready: false, status: 504 });
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
