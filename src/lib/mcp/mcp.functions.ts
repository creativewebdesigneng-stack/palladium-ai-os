import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { encryptToken } from "@/lib/integrations/oauth.server";
import { listExternalMcpTools, validateExternalMcpEndpoint } from "./external-mcp.server";

type Sb = { from: (table: string) => any };

function normaliseSlug(value: string): string {
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 63);
  if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(slug)) throw new Error("MCP server slug is invalid.");
  return slug;
}

function normaliseHeaderName(value?: string | null): string | null {
  const header = value?.trim() || null;
  if (!header) return null;
  if (!/^[A-Za-z][A-Za-z0-9-]{0,63}$/.test(header)) throw new Error("MCP auth header name is invalid.");
  if (["host", "content-length", "connection", "transfer-encoding", "mcp-session-id"].includes(header.toLowerCase())) {
    throw new Error("That MCP auth header is reserved.");
  }
  return header;
}

function normaliseAllowedTools(value?: string[]): string[] {
  return [...new Set((value ?? []).map((item) => item.trim()).filter(Boolean).map((item) => item.slice(0, 160)))].slice(0, 200);
}

export const listExternalMcpServers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb
      .from("external_mcp_servers")
      .select("id,org_id,name,slug,endpoint_url,auth_header_name,enabled,requires_approval,allowed_tool_names,cached_tools,last_discovered_at,created_at,updated_at")
      .order("name", { ascending: true });
    if (error) throw new Error("Could not load external MCP servers.");
    return data ?? [];
  });

export const saveExternalMcpServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    id?: string | null;
    orgId?: string | null;
    name: string;
    slug: string;
    endpointUrl: string;
    authHeaderName?: string | null;
    authHeaderValue?: string | null;
    clearAuth?: boolean;
    enabled?: boolean;
    requiresApproval?: boolean;
    allowedToolNames?: string[];
  }) => input)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;
    const name = data.name.trim().slice(0, 120);
    if (!name) throw new Error("MCP server name is required.");
    const endpoint = validateExternalMcpEndpoint(data.endpointUrl).toString();
    const authHeaderName = normaliseHeaderName(data.authHeaderName);
    const authValue = data.authHeaderValue?.trim() ?? "";
    if (authValue.length > 8192) throw new Error("MCP auth header value is too large.");
    if (authValue && !authHeaderName) throw new Error("Choose an auth header name before saving its secret value.");

    const row: Record<string, unknown> = {
      user_id: userId,
      org_id: data.orgId ?? null,
      name,
      slug: normaliseSlug(data.slug),
      endpoint_url: endpoint,
      auth_header_name: authHeaderName,
      enabled: data.enabled ?? true,
      requires_approval: data.requiresApproval ?? true,
      allowed_tool_names: normaliseAllowedTools(data.allowedToolNames),
      updated_at: new Date().toISOString(),
    };
    if (data.clearAuth) row["auth_header_ciphertext"] = null;
    else if (authValue) row["auth_header_ciphertext"] = encryptToken(authValue);

    let result;
    if (data.id) {
      result = await sb
        .from("external_mcp_servers")
        .update(row)
        .eq("id", data.id)
        .eq("user_id", userId)
        .select("id,org_id,name,slug,endpoint_url,auth_header_name,enabled,requires_approval,allowed_tool_names,cached_tools,last_discovered_at,created_at,updated_at")
        .maybeSingle();
    } else {
      result = await sb
        .from("external_mcp_servers")
        .insert(row)
        .select("id,org_id,name,slug,endpoint_url,auth_header_name,enabled,requires_approval,allowed_tool_names,cached_tools,last_discovered_at,created_at,updated_at")
        .maybeSingle();
    }
    if (result.error || !result.data) throw new Error("Could not save the external MCP server.");

    await sb.from("mission_audit_logs").insert({
      user_id: userId,
      action: data.id ? "external_mcp_server_updated" : "external_mcp_server_created",
      target_type: "external_mcp_server",
      target_id: result.data.id,
      status: "success",
      metadata: {
        slug: result.data.slug,
        enabled: result.data.enabled,
        requires_approval: result.data.requires_approval,
        has_auth: Boolean(authValue || (!data.clearAuth && data.id)),
      },
    });
    return result.data;
  });

export const discoverExternalMcpServerTools = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { serverId: string }) => input)
  .handler(async ({ data, context }) => {
    return listExternalMcpTools({
      sb: context.supabase as unknown as Sb,
      userId: context.userId,
      serverId: data.serverId,
    });
  });

export const deleteExternalMcpServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { serverId: string }) => input)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb
      .from("external_mcp_servers")
      .delete()
      .eq("id", data.serverId)
      .eq("user_id", context.userId);
    if (error) throw new Error("Could not delete the external MCP server.");
    await sb.from("mission_audit_logs").insert({
      user_id: context.userId,
      action: "external_mcp_server_deleted",
      target_type: "external_mcp_server",
      target_id: data.serverId,
      status: "success",
    });
    return { deleted: true };
  });
