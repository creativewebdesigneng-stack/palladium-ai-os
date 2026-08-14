/**
 * Security Centre reads.
 *
 * Everything here is user-scoped and server-authoritative: API keys, webhooks,
 * integrations and audit events all come from the caller's own rows under RLS,
 * and the posture score / alerts / recommendations are derived from those rows
 * rather than being stored or supplied by the browser.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sb = { from: (t: string) => any };

const DAY = 24 * 60 * 60 * 1000;

function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null;
  const t = Date.parse(value);
  if (Number.isNaN(t)) return null;
  return Math.round((t - Date.now()) / DAY);
}

function keyStatus(row: any): "active" | "expiring" | "expired" | "revoked" {
  if (row.revoked_at || row.is_active === false) return "revoked";
  const d = daysUntil(row.expires_at);
  if (d != null && d < 0) return "expired";
  if (d != null && d <= 7) return "expiring";
  return "active";
}

export const getSecurityCentre = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const claims = context.claims as Record<string, any>;
    const request = getRequest();

    const [keysRes, hooksRes, deliveriesRes, integrationsRes, auditRes, auditCountRes] =
      await Promise.all([
        sb
          .from("api_keys")
          .select(
            "id,name,key_prefix,environment,scopes,request_count,is_active,revoked_at,expires_at,last_used_at,created_at",
          )
          .order("created_at", { ascending: false }),
        sb
          .from("webhooks")
          .select(
            "id,name,url,events,is_active,secret_prefix,delivery_count,failure_count,last_delivery_at,created_at",
          )
          .order("created_at", { ascending: false }),
        sb
          .from("webhook_deliveries")
          .select("id,webhook_id,event,status,response_status,created_at")
          .order("created_at", { ascending: false })
          .limit(50),
        sb
          .from("integrations")
          .select(
            "id,provider,name,status,scopes,granted_scopes,account_label,last_error,connected_at,expires_at",
          )
          .order("created_at", { ascending: false }),
        sb
          .from("mission_audit_logs")
          .select("id,action,target_type,target_id,status,metadata,ip_address,created_at")
          .eq("user_id", context.userId)
          .order("created_at", { ascending: false })
          .limit(100),
        sb
          .from("mission_audit_logs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", context.userId)
          .gte("created_at", new Date(Date.now() - 30 * DAY).toISOString()),
      ]);

    const keys: any[] = (keysRes.data ?? []).map((k: any) => ({
      id: k.id,
      name: k.name,
      prefix: k.key_prefix ?? "",
      environment: k.environment ?? "live",
      scopes: k.scopes ?? [],
      requests: Number(k.request_count ?? 0),
      created_at: k.created_at,
      last_used_at: k.last_used_at ?? null,
      expires_at: k.expires_at ?? null,
      expires_in_days: daysUntil(k.expires_at),
      status: keyStatus(k),
    }));

    const lastStatus = new Map<string, number | null>();
    for (const d of deliveriesRes.data ?? [])
      if (!lastStatus.has(d.webhook_id)) lastStatus.set(d.webhook_id, d.response_status ?? null);

    const webhooks: any[] = (hooksRes.data ?? []).map((h: any) => ({
      id: h.id,
      name: h.name ?? h.url,
      url: h.url,
      events: (h.events ?? []).length,
      event_names: h.events ?? [],
      deliveries: Number(h.delivery_count ?? 0),
      failures: Number(h.failure_count ?? 0),
      last_delivery_at: h.last_delivery_at ?? null,
      last_response_status: lastStatus.get(h.id) ?? null,
      status: h.is_active === false ? "disabled" : "active",
    }));

    const integrations: any[] = (integrationsRes.data ?? []).map((i: any) => ({
      id: i.id,
      provider: i.provider,
      name: i.name ?? i.provider,
      account: i.account_label ?? "",
      scopes: i.granted_scopes ?? i.scopes ?? [],
      connected_at: i.connected_at ?? null,
      expires_in_days: daysUntil(i.expires_at),
      last_error: i.last_error ?? null,
      status:
        i.status === "connected" && (i.last_error || (daysUntil(i.expires_at) ?? 99) < 0)
          ? "needs_reauth"
          : (i.status ?? "disconnected"),
    }));

    const auditLogs: any[] = (auditRes.data ?? []).map((r: any) => ({
      id: r.id,
      action: r.action,
      resource: r.target_type ? `${r.target_type}${r.target_id ? ` · ${r.target_id}` : ""}` : "—",
      ip: r.ip_address ?? "—",
      created_at: r.created_at,
      result: r.status === "denied" || r.status === "failed" ? "failed" : "success",
      severity: r.status === "denied" || r.status === "failed" ? "warning" : "info",
    }));

    // Alerts are derived facts, never fabricated.
    const alerts: Array<{
      id: string;
      kind: string;
      title: string;
      detail: string;
      severity: "critical" | "warning" | "info";
      at: string | null;
    }> = [];

    for (const l of auditLogs.filter((a) => a.result === "failed").slice(0, 5))
      alerts.push({
        id: `audit-${l.id}`,
        kind: "denied",
        title: "Denied or failed action",
        detail: `${l.action} · ${l.ip}`,
        severity: "critical",
        at: l.created_at,
      });

    for (const i of integrations.filter((x) => x.status === "needs_reauth"))
      alerts.push({
        id: `integration-${i.id}`,
        kind: "integration",
        title: `${i.name} needs re-authorisation`,
        detail: i.last_error ?? "Access token expired",
        severity: "warning",
        at: i.connected_at,
      });

    for (const k of keys.filter((x) => x.status === "expiring" || x.status === "expired"))
      alerts.push({
        id: `key-${k.id}`,
        kind: "key",
        title: `API key ${k.status === "expired" ? "expired" : "expiring soon"}`,
        detail: `${k.name} · ${k.prefix}`,
        severity: k.status === "expired" ? "critical" : "warning",
        at: k.expires_at,
      });

    for (const w of webhooks.filter((x) => x.failures > 0))
      alerts.push({
        id: `hook-${w.id}`,
        kind: "webhook",
        title: `${w.failures} failed webhook ${w.failures === 1 ? "delivery" : "deliveries"}`,
        detail: w.url,
        severity: "warning",
        at: w.last_delivery_at,
      });

    const providers: string[] = Array.isArray(claims?.["amr"])
      ? claims["amr"].map((a: any) => a?.method).filter(Boolean)
      : [];
    const aal = String(claims?.["aal"] ?? "aal1");
    const mfaEnabled = aal === "aal2";
    const emailVerified = Boolean(
      claims?.["email_verified"] ?? claims?.["user_metadata"]?.["email_verified"],
    );

    const account = {
      email: (claims?.["email"] as string) ?? "",
      provider: providers[0] ?? "password",
      providers,
      aal,
      mfaEnabled,
      emailVerified,
      sessionExpiresAt: claims?.["exp"]
        ? new Date(Number(claims["exp"]) * 1000).toISOString()
        : null,
      issuedAt: claims?.["iat"] ? new Date(Number(claims["iat"]) * 1000).toISOString() : null,
      ip:
        request?.headers?.get("cf-connecting-ip") ?? request?.headers?.get("x-forwarded-for") ?? "",
      userAgent: request?.headers?.get("user-agent") ?? "",
    };

    const activeKeys = keys.filter((k) => k.status === "active").length;
    const riskyKeys = keys.filter((k) => k.status === "expiring" || k.status === "expired").length;
    const connectedIntegrations = integrations.filter((i) => i.status === "connected").length;
    const reauthIntegrations = integrations.filter((i) => i.status === "needs_reauth").length;
    const failedEvents = auditLogs.filter((a) => a.result === "failed").length;

    const breakdown = [
      {
        key: "mfa",
        label: "Multi-factor auth",
        value: mfaEnabled ? 100 : 40,
        note: mfaEnabled
          ? "Second factor verified on this session"
          : "No second factor on this session",
      },
      {
        key: "email",
        label: "Email verification",
        value: emailVerified ? 100 : 50,
        note: emailVerified ? "Email address verified" : "Email address not verified",
      },
      {
        key: "keys",
        label: "API key hygiene",
        value: keys.length === 0 ? 100 : Math.max(30, 100 - riskyKeys * 25),
        note:
          keys.length === 0
            ? "No API keys issued"
            : `${activeKeys} healthy · ${riskyKeys} expiring or expired`,
      },
      {
        key: "integrations",
        label: "Integration security",
        value: integrations.length === 0 ? 100 : Math.max(30, 100 - reauthIntegrations * 30),
        note:
          integrations.length === 0
            ? "No third-party connections"
            : `${connectedIntegrations} healthy · ${reauthIntegrations} need re-auth`,
      },
      {
        key: "webhooks",
        label: "Webhook delivery",
        value: webhooks.length === 0 ? 100 : webhooks.some((w) => w.failures > 0) ? 65 : 100,
        note:
          webhooks.length === 0
            ? "No webhook endpoints"
            : `${webhooks.length} endpoint${webhooks.length === 1 ? "" : "s"} · ${webhooks.reduce((n, w) => n + w.failures, 0)} failures`,
      },
      {
        key: "activity",
        label: "Access anomalies",
        value: Math.max(40, 100 - failedEvents * 10),
        note: failedEvents
          ? `${failedEvents} denied or failed action${failedEvents === 1 ? "" : "s"} recorded`
          : "No denied actions recorded",
      },
    ];

    const total = Math.round(breakdown.reduce((n, b) => n + b.value, 0) / breakdown.length);

    const recommendations: Array<{
      id: string;
      title: string;
      impact: "High" | "Medium" | "Low";
      detail: string;
      action: string;
      tab: string;
      kind: string;
    }> = [];

    if (!mfaEnabled)
      recommendations.push({
        id: "rec-mfa",
        kind: "mfa",
        title: "Add a second authentication factor",
        impact: "High",
        detail: "This session was verified with a single factor (aal1).",
        action: "Open settings",
        tab: "Authentication",
      });
    if (!emailVerified)
      recommendations.push({
        id: "rec-email",
        kind: "email",
        title: "Verify your email address",
        impact: "High",
        detail: "Account recovery depends on a verified email address.",
        action: "Open settings",
        tab: "Authentication",
      });
    if (riskyKeys)
      recommendations.push({
        id: "rec-keys",
        kind: "key",
        title: "Rotate expiring API keys",
        impact: "Medium",
        detail: `${riskyKeys} key${riskyKeys === 1 ? "" : "s"} expire within 7 days or have already expired.`,
        action: "Review keys",
        tab: "API Security",
      });
    if (reauthIntegrations)
      recommendations.push({
        id: "rec-integrations",
        kind: "integration",
        title: "Re-authorise connected integrations",
        impact: "Medium",
        detail: `${reauthIntegrations} connection${reauthIntegrations === 1 ? "" : "s"} lost valid access.`,
        action: "Review connections",
        tab: "API Security",
      });
    if (failedEvents)
      recommendations.push({
        id: "rec-audit",
        kind: "audit",
        title: "Review denied actions",
        impact: failedEvents > 3 ? "High" : "Low",
        detail: `${failedEvents} denied or failed action${failedEvents === 1 ? "" : "s"} in your recent audit trail.`,
        action: "Open audit log",
        tab: "Audit Log",
      });

    const metrics = [
      {
        key: "score",
        label: "Security Score",
        value: String(total),
        detail: total >= 85 ? "Good" : total >= 70 ? "Fair" : "Needs work",
      },
      {
        key: "mfa",
        label: "Session Assurance",
        value: aal.toUpperCase(),
        detail: mfaEnabled ? "Two factors" : "Single factor",
      },
      {
        key: "keys",
        label: "API Keys",
        value: String(keys.length),
        detail: riskyKeys ? `${riskyKeys} expiring` : "All healthy",
      },
      {
        key: "integrations",
        label: "Integrations",
        value: String(integrations.length),
        detail: reauthIntegrations ? `${reauthIntegrations} need re-auth` : "All reviewed",
      },
      {
        key: "webhooks",
        label: "Webhooks",
        value: String(webhooks.length),
        detail: `${webhooks.reduce((n, w) => n + w.deliveries, 0)} deliveries`,
      },
      {
        key: "alerts",
        label: "Security Alerts",
        value: String(alerts.length),
        detail: `${alerts.filter((a) => a.severity === "critical").length} critical`,
      },
      {
        key: "audit",
        label: "Audit Events",
        value: String(auditCountRes.count ?? auditLogs.length),
        detail: "last 30 days",
      },
      {
        key: "denied",
        label: "Denied Actions",
        value: String(failedEvents),
        detail: "recent trail",
      },
    ];

    return {
      generatedAt: new Date().toISOString(),
      account,
      keys,
      webhooks,
      integrations,
      auditLogs,
      auditTotal: auditCountRes.count ?? auditLogs.length,
      alerts: alerts.slice(0, 12),
      metrics,
      score: { total, breakdown },
      recommendations,
    };
  });
