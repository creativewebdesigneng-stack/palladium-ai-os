import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "npm:postgres@3.4.3";

type HeartbeatBody = {
  targetId?: unknown;
  health?: unknown;
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

const databaseUrl = Deno.env.get("SUPABASE_DB_URL")?.trim() ?? "";
const sql = databaseUrl ? postgres(databaseUrl, { prepare: false, max: 1 }) : null;

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!sql) return json({ error: "Runtime target database unavailable" }, 503);

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (token.length < 64) return json({ error: "Unauthorized" }, 401);

  let body: HeartbeatBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const targetId = typeof body.targetId === "string" ? body.targetId.trim() : "";
  const health = body.health === "degraded" ? "degraded" : body.health === "healthy" ? "healthy" : "";
  if (!validUuid(targetId) || !health) {
    return json({ error: "targetId and health are required" }, 400);
  }

  try {
    const rows = await sql<{
      id: string;
      deployment_target: string;
      region: string | null;
      health: string;
      attested_at: string;
      expires_at: string;
    }[]>`
      update public.ai_hub_runtime_targets
      set health = ${health},
          last_seen_at = now(),
          attested_at = now(),
          expires_at = now() + interval '10 minutes',
          updated_at = now()
      where id = ${targetId}::uuid
        and revoked_at is null
        and token_sha256 = encode(extensions.digest(${token}, 'sha256'), 'hex')
      returning id, deployment_target, region, health, attested_at, expires_at
    `;

    const target = rows[0];
    if (!target) return json({ error: "Unauthorized" }, 401);

    return json({
      target,
      heartbeatEverySeconds: 300,
      expiresAfterSeconds: 600,
    });
  } catch (error) {
    console.error("[ai-hub-runtime-target-heartbeat] update failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return json({ error: "Runtime target heartbeat unavailable" }, 503);
  }
});