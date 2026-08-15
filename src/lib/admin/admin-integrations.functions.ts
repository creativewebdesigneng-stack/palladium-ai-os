import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isPlatformAdmin } from "@/lib/marketplace/marketplace.server";
import { INTEGRATION_PROVIDERS } from "@/lib/integrations/providers";

type Sb = { from: (t: string) => any };

type IntegrationRow = {
  id: string;
  user_id: string;
  org_id?: string | null;
  provider: string;
  status: string;
  account_label?: string | null;
  last_error?: string | null;
  connected_at?: string | null;
  last_sync_at?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
};

export function aggregateIntegrationRows(rows: IntegrationRow[]) {
  const byProvider = new Map<string, { total: number; connected: number; errors: number; pending: number; disconnected: number }>();
  for (const row of rows) {
    const current = byProvider.get(row.provider) ?? { total: 0, connected: 0, errors: 0, pending: 0, disconnected: 0 };
    current.total += 1;
    if (row.status === "connected") current.connected += 1;
    else if (row.status === "error") current.errors += 1;
    else if (row.status === "pending") current.pending += 1;
    else current.disconnected += 1;
    byProvider.set(row.provider, current);
  }
  return byProvider;
}

export const listAdminIntegrationOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const caller = context.supabase as unknown as Sb;
    if (!(await isPlatformAdmin(caller as never, context.userId))) {
      return { forbidden: true as const };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { providerConfigured } = await import("@/lib/integrations/oauth.server");
    const { data, error } = await supabaseAdmin
      .from("integrations")
      .select("id,user_id,org_id,provider,status,account_label,last_error,connected_at,last_sync_at,expires_at,created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as IntegrationRow[];
    const aggregate = aggregateIntegrationRows(rows);
    const providers = INTEGRATION_PROVIDERS.map((provider) => {
      const counts = aggregate.get(provider.id) ?? { total: 0, connected: 0, errors: 0, pending: 0, disconnected: 0 };
      return {
        id: provider.id,
        name: provider.name,
        category: provider.category,
        configured: providerConfigured(provider),
        tools: provider.tools,
        ...counts,
      };
    });

    const recent = rows.slice(0, 50).map((row) => ({
      id: String(row.id),
      provider: String(row.provider),
      status: String(row.status),
      userId: String(row.user_id),
      orgId: row.org_id ? String(row.org_id) : null,
      accountLabel: row.account_label ? String(row.account_label).slice(0, 160) : null,
      lastError: row.last_error ? String(row.last_error).slice(0, 300) : null,
      connectedAt: row.connected_at ? String(row.connected_at) : null,
      lastSyncAt: row.last_sync_at ? String(row.last_sync_at) : null,
      expiresAt: row.expires_at ? String(row.expires_at) : null,
      createdAt: row.created_at ? String(row.created_at) : null,
    }));

    return {
      forbidden: false as const,
      summary: {
        totalConnections: rows.length,
        connected: rows.filter((row) => row.status === "connected").length,
        errors: rows.filter((row) => row.status === "error").length,
        configuredProviders: providers.filter((provider) => provider.configured).length,
        providerCount: providers.length,
      },
      providers,
      recent,
    };
  });
