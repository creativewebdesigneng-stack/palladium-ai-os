import type { ToolDef } from "@/lib/runtime/model-gateway.server";
import type { ToolContext } from "@/lib/runtime/tools-core.server";

const actions = ["list_projects", "create_project", "list_snapshots", "record_snapshot"] as const;
type Action = (typeof actions)[number];

export const SEO_TOOL_DEF: ToolDef = {
  name: "seo_ops",
  description: "Inspect and record provider-neutral SEO projects, keyword/rank/backlink observations, and site-audit findings. Credentials are never accepted in tool input; external data must come through approved integrations or other tools.",
  parameters: {
    type: "object",
    properties: {
      action: { type: "string", enum: [...actions] },
      project_id: { type: "string" },
      name: { type: "string" },
      domain: { type: "string" },
      kind: { type: "string", enum: ["keyword", "rank", "backlink", "audit"] },
      subject: { type: "string" },
      metrics: { type: "object" },
      notes: { type: "string" },
      source: { type: "string" },
    },
    required: ["action"],
    additionalProperties: false,
  },
};

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max) : "";
}
function uuid(value: unknown) {
  const text = clean(value, 60);
  if (!/^[0-9a-f-]{36}$/i.test(text)) throw new Error("A valid SEO project ID is required.");
  return text;
}
function domain(value: unknown) {
  const text = clean(value, 255).toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  if (!text.includes(".")) throw new Error("A valid domain is required.");
  return text;
}

export async function runSeoTool(input: Record<string, unknown>, ctx: ToolContext) {
  const selected = clean(input["action"], 40) as Action;
  if (!actions.includes(selected)) throw new Error("Unsupported SEO action.");
  const sb = ctx.sb;

  if (selected === "list_projects") {
    const { data, error } = await sb.from("seo_projects").select("id,name,domain,provider,location_code,language_code,updated_at").eq("user_id", ctx.userId).order("updated_at", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return { projects: data ?? [] };
  }

  if (selected === "list_snapshots") {
    const projectId = input["project_id"] ? uuid(input["project_id"]) : null;
    let query = sb.from("seo_snapshots").select("id,project_id,kind,subject,metrics,notes,source,observed_at").eq("user_id", ctx.userId).order("observed_at", { ascending: false }).limit(250);
    if (projectId) query = query.eq("project_id", projectId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { snapshots: data ?? [] };
  }

  if (selected === "create_project") {
    const { data, error } = await sb.from("seo_projects").insert({
      user_id: ctx.userId,
      org_id: ctx.orgId ?? null,
      name: clean(input["name"], 160) || domain(input["domain"]),
      domain: domain(input["domain"]),
      provider: "provider-neutral",
    }).select("id,name,domain,provider,updated_at").single();
    if (error || !data) throw new Error(error?.message ?? "Could not create SEO project.");
    return { project: data };
  }

  const projectId = uuid(input["project_id"]);
  const kind = clean(input["kind"], 20);
  if (!["keyword", "rank", "backlink", "audit"].includes(kind)) throw new Error("Unsupported SEO snapshot kind.");
  const subject = clean(input["subject"], 500);
  if (!subject) throw new Error("SEO snapshot subject is required.");
  const metrics = input["metrics"] && typeof input["metrics"] === "object" && !Array.isArray(input["metrics"])
    ? Object.fromEntries(Object.entries(input["metrics"] as Record<string, unknown>).slice(0, 50))
    : {};
  const { data, error } = await sb.from("seo_snapshots").insert({
    user_id: ctx.userId,
    project_id: projectId,
    kind,
    subject,
    metrics,
    notes: clean(input["notes"], 20_000),
    source: clean(input["source"], 120) || "agent",
  }).select("id,project_id,kind,subject,metrics,notes,source,observed_at").single();
  if (error || !data) throw new Error(error?.message ?? "Could not record SEO snapshot.");
  return { snapshot: data };
}
