import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const UPSTREAM = "https://palladium-ai-os.vercel.app/api/internal/workflow-runs";

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function runtimeSecretKey() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS")?.trim();
  if (!raw) throw new Error("SUPABASE_SECRET_KEYS is unavailable.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("SUPABASE_SECRET_KEYS is invalid.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("SUPABASE_SECRET_KEYS is invalid.");
  }
  const key = (parsed as Record<string, unknown>)["default"];
  if (typeof key !== "string" || !key.startsWith("sb_secret_")) {
    throw new Error("The default Supabase secret key is unavailable.");
  }
  return key;
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (token.length < 32) return json({ error: "Unauthorized" }, 401);

  const incoming = new URL(request.url);
  const requested = Number(incoming.searchParams.get("limit") ?? 2);
  const limit = Number.isFinite(requested)
    ? Math.max(1, Math.min(4, Math.trunc(requested)))
    : 2;

  let secretKey: string;
  try {
    secretKey = runtimeSecretKey();
  } catch {
    console.error("[runtime-worker-dispatch] Supabase secret key unavailable");
    return json({ error: "Runtime database credential unavailable" }, 503);
  }

  try {
    const upstream = await fetch(`${UPSTREAM}?limit=${limit}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-blackstar-supabase-secret-key": secretKey,
      },
      body: "{}",
      redirect: "error",
      signal: AbortSignal.timeout(55_000),
    });

    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    console.error("[runtime-worker-dispatch] upstream worker unavailable");
    return json({ error: "Runtime worker unavailable" }, 503);
  }
});
