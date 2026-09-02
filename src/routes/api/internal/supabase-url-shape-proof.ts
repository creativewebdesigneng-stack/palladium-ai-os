import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/internal/supabase-url-shape-proof")({
  server: {
    handlers: {
      GET: async () => {
        const raw = process.env["SUPABASE_URL"] ?? "";
        let parsed: URL | null = null;
        try { parsed = new URL(raw); } catch {}
        return new Response(JSON.stringify({
          configured: Boolean(raw),
          parseable: Boolean(parsed),
          protocol: parsed?.protocol ?? null,
          hostname: parsed?.hostname ?? null,
          pathname: parsed?.pathname ?? null,
          has_quotes: raw.startsWith('"') || raw.endsWith('"') || raw.startsWith("'") || raw.endsWith("'"),
          has_whitespace: /\s/.test(raw),
          looks_like_supabase_project_url: Boolean(parsed && parsed.protocol === "https:" && /\.supabase\.co$/i.test(parsed.hostname) && (parsed.pathname === "/" || parsed.pathname === "")),
        }), { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
      },
    },
  },
});
