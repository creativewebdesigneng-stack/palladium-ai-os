import type { ToolDef } from "@/lib/runtime/model-gateway.server";
import type { ToolContext } from "@/lib/runtime/tools-core.server";

const actions = ["list_documents","get_document","create_document","update_document"] as const;
type Action = (typeof actions)[number];

export const HTML_STUDIO_TOOL_DEF: ToolDef = {
  name: "html_studio",
  description: "Create and maintain standalone HTML Studio artifacts from source material. Use this when an agent needs to turn text, Markdown, CSV/JSON/SQL or notes into polished HTML. HTML is persisted for operator preview/export; this tool does not deploy or publish externally.",
  parameters: {
    type: "object",
    properties: {
      action: { type: "string", enum: [...actions] },
      document_id: { type: "string" },
      title: { type: "string" },
      source_kind: { type: "string", enum: ["text","markdown","csv","json","sql","note","file"] },
      source_text: { type: "string" },
      html: { type: "string" },
      surface: { type: "string", enum: ["document","report","poster","deck","social","prototype","resume","frame"] },
      status: { type: "string", enum: ["draft","ready","archived"] },
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
  if (!/^[0-9a-f-]{36}$/i.test(text)) throw new Error("A valid HTML Studio document ID is required.");
  return text;
}

function action(value: unknown): Action {
  const text = clean(value, 40) as Action;
  if (!actions.includes(text)) throw new Error("Unsupported HTML Studio action.");
  return text;
}

function dto(row: any) {
  return {
    id: String(row.id), title: String(row.title ?? "Untitled HTML"),
    source_kind: String(row.source_kind ?? "text"), source_text: String(row.source_text ?? ""),
    html: String(row.html ?? ""), surface: String(row.surface ?? "document"),
    status: String(row.status ?? "draft"), updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

export async function runHtmlStudioTool(input: Record<string, unknown>, ctx: ToolContext) {
  const selected = action(input.action);
  const sb = ctx.sb;

  if (selected === "list_documents") {
    const { data, error } = await sb.from("html_studio_documents")
      .select("id,title,source_kind,surface,status,updated_at")
      .eq("user_id", ctx.userId).order("updated_at", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return { documents: (data ?? []).map((row: any) => ({ id: String(row.id), title: String(row.title), source_kind: String(row.source_kind), surface: String(row.surface), status: String(row.status), updated_at: row.updated_at ? String(row.updated_at) : null })) };
  }

  if (selected === "get_document") {
    const { data, error } = await sb.from("html_studio_documents").select("*").eq("id", uuid(input.document_id)).eq("user_id", ctx.userId).single();
    if (error || !data) throw new Error(error?.message ?? "HTML Studio document not found.");
    return { document: dto(data) };
  }

  const sourceKind = clean(input.source_kind, 20) || "text";
  const surface = clean(input.surface, 20) || "document";
  const status = clean(input.status, 20) || "draft";
  if (!["text","markdown","csv","json","sql","note","file"].includes(sourceKind)) throw new Error("Unsupported source kind.");
  if (!["document","report","poster","deck","social","prototype","resume","frame"].includes(surface)) throw new Error("Unsupported surface.");
  if (!["draft","ready","archived"].includes(status)) throw new Error("Unsupported document status.");

  const row = {
    title: clean(input.title, 200) || "Untitled HTML",
    source_kind: sourceKind,
    source_text: typeof input.source_text === "string" ? input.source_text.slice(0, 500_000) : "",
    html: typeof input.html === "string" ? input.html.slice(0, 1_000_000) : "",
    surface,
    status,
    updated_at: new Date().toISOString(),
  };

  const result = selected === "create_document"
    ? await sb.from("html_studio_documents").insert({ ...row, user_id: ctx.userId, org_id: ctx.orgId ?? null }).select("*").single()
    : await sb.from("html_studio_documents").update(row).eq("id", uuid(input.document_id)).eq("user_id", ctx.userId).select("*").single();
  if (result.error || !result.data) throw new Error(result.error?.message ?? "Could not save HTML Studio document.");
  return { document: dto(result.data) };
}
