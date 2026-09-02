import { createFileRoute } from "@tanstack/react-router";

/** Temporary production diagnostic. Returns only the Supabase hostname/ref, never credentials. */
export const Route = createFileRoute("/api/internal/supabase-link-6c9e31b4")({
  server: {
    handlers: {
      GET: async () => {
        const raw = process.env["SUPABASE_URL"] ?? "";
        let hostname: string | null = null;
        let projectRef: string | null = null;
        try {
          const url = new URL(raw);
          hostname = url.hostname;
          const match = /^([a-z0-9-]+)\.supabase\.co$/i.exec(hostname);
          projectRef = match?.[1] ?? null;
        } catch {
          // Intentionally return nulls if the value is absent or malformed.
        }
        return new Response(JSON.stringify({ configured: Boolean(raw), hostname, projectRef }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
            "X-Robots-Tag": "noindex",
          },
        });
      },
    },
  },
});
