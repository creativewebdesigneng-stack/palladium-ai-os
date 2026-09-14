import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CREDENTIAL = "retail_booking_reminder_dispatch";
const MAX_PER_RUN = 50;
const KIND = "retail.booking_reminder";
const jsonHeaders = { "Content-Type": "application/json" };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: jsonHeaders });

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}
function bearer(req: Request): string {
  const match = /^Bearer\s+(.+)$/i.exec((req.headers.get("authorization") || "").trim());
  return match?.[1]?.trim() || "";
}
async function authorized(supabase: any, req: Request): Promise<boolean> {
  const token = bearer(req);
  if (token.length < 32 || token.length > 512) return false;
  const { data, error } = await supabase.from("retail_scheduler_credentials").select("token_sha256,enabled").eq("name", CREDENTIAL).maybeSingle();
  if (error || !data?.enabled || typeof data.token_sha256 !== "string") return false;
  return safeEqual(await sha256(token), data.token_sha256);
}

const severityRank: Record<string, number> = { info: 0, success: 0, warning: 1, critical: 2 };
async function preferenceAllows(supabase: any, userId: string): Promise<boolean> {
  const { data, error } = await supabase.from("notification_preferences").select("in_app,min_severity,muted_types").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`preference_load_failed:${error.message}`);
  if (!data) return true;
  if (data.in_app === false) return false;
  if (Array.isArray(data.muted_types) && data.muted_types.includes(KIND)) return false;
  return severityRank.info >= (severityRank[String(data.min_severity || "info")] ?? 0);
}
function backoffIso(attempt: number): string {
  const seconds = Math.min(3600, 60 * Math.pow(2, Math.max(0, attempt - 1)));
  return new Date(Date.now() + seconds * 1000).toISOString();
}
async function updateReminder(supabase: any, id: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from("retail_booking_reminders").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(`reminder_update_failed:${error.message}`);
}

async function dispatchOne(supabase: any, reminder: any) {
  const now = new Date().toISOString();
  if (Number(reminder.attempt_count || 0) >= Number(reminder.max_attempts || 5)) {
    await updateReminder(supabase, reminder.id, { status: "failed", last_error: "max_attempts_exhausted" });
    return { id: reminder.id, status: "failed", reason: "max_attempts_exhausted" };
  }

  // Optimistic claim prevents two overlapping cron invocations from sending the same reminder.
  const nextAttempt = Number(reminder.attempt_count || 0) + 1;
  const { data: claimed, error: claimError } = await supabase
    .from("retail_booking_reminders")
    .update({ attempt_count: nextAttempt, last_attempt_at: now, updated_at: now })
    .eq("id", reminder.id)
    .eq("status", "scheduled")
    .eq("attempt_count", Number(reminder.attempt_count || 0))
    .select("id")
    .maybeSingle();
  if (claimError) throw new Error(`claim_failed:${claimError.message}`);
  if (!claimed) return { id: reminder.id, status: "skipped", reason: "already_claimed" };

  try {
    const [{ data: appointment, error: appointmentError }, { data: workspace, error: workspaceError }] = await Promise.all([
      supabase.from("retail_appointments").select("id,customer_name,starts_at,status,service_item_id").eq("id", reminder.appointment_id).eq("user_id", reminder.user_id).maybeSingle(),
      supabase.from("retail_workspaces").select("id,business_name,timezone").eq("id", reminder.workspace_id).eq("user_id", reminder.user_id).maybeSingle(),
    ]);
    if (appointmentError) throw new Error(`appointment_load_failed:${appointmentError.message}`);
    if (workspaceError) throw new Error(`workspace_load_failed:${workspaceError.message}`);
    if (!appointment || !workspace) {
      await updateReminder(supabase, reminder.id, { status: "skipped", last_error: "appointment_or_workspace_missing" });
      return { id: reminder.id, status: "skipped", reason: "appointment_or_workspace_missing" };
    }
    if (["completed", "cancelled", "no_show"].includes(String(appointment.status))) {
      await updateReminder(supabase, reminder.id, { status: "skipped", last_error: `appointment_${appointment.status}` });
      return { id: reminder.id, status: "skipped", reason: `appointment_${appointment.status}` };
    }
    if (new Date(appointment.starts_at).getTime() <= Date.now()) {
      await updateReminder(supabase, reminder.id, { status: "skipped", last_error: "appointment_already_started" });
      return { id: reminder.id, status: "skipped", reason: "appointment_already_started" };
    }

    if (reminder.channel !== "in_app") {
      await updateReminder(supabase, reminder.id, { status: "skipped", last_error: `provider_not_configured:${reminder.channel}` });
      return { id: reminder.id, status: "skipped", reason: `provider_not_configured:${reminder.channel}` };
    }

    if (!(await preferenceAllows(supabase, reminder.user_id))) {
      await updateReminder(supabase, reminder.id, { status: "skipped", last_error: "notification_preferences_suppressed" });
      return { id: reminder.id, status: "skipped", reason: "notification_preferences_suppressed" };
    }

    const existing = await supabase.from("notifications").select("id").eq("user_id", reminder.user_id).eq("kind", KIND).contains("metadata", { retail_booking_reminder_id: reminder.id }).limit(1);
    if (existing.error) throw new Error(`notification_dedupe_failed:${existing.error.message}`);
    if (!existing.data?.length) {
      const { error: notificationError } = await supabase.from("notifications").insert({
        user_id: reminder.user_id,
        kind: KIND,
        severity: "info",
        title: `Upcoming booking at ${String(workspace.business_name).slice(0, 120)}`,
        body: `${String(appointment.customer_name || "Customer").slice(0, 120)} · ${new Date(appointment.starts_at).toISOString()}`,
        link: "/retail-hub",
        metadata: {
          retail_booking_reminder_id: reminder.id,
          retail_appointment_id: appointment.id,
          retail_workspace_id: workspace.id,
          scheduled_for: reminder.scheduled_for,
        },
      });
      if (notificationError && notificationError.code !== "23505") throw new Error(`notification_insert_failed:${notificationError.message}`);
    }

    await updateReminder(supabase, reminder.id, { status: "sent", sent_at: now, last_error: null, provider_message_id: `in_app:${reminder.id}` });
    return { id: reminder.id, status: "sent", channel: "in_app" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "dispatch_failed";
    const terminal = nextAttempt >= Number(reminder.max_attempts || 5);
    await updateReminder(supabase, reminder.id, {
      status: terminal ? "failed" : "scheduled",
      next_attempt_at: terminal ? null : backoffIso(nextAttempt),
      last_error: message.slice(0, 1800),
    });
    return { id: reminder.id, status: terminal ? "failed" : "retry", reason: message };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return response({ error: "method_not_allowed" }, 405);
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceKey) return response({ error: "server_configuration_missing" }, 500);
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  if (!(await authorized(supabase, req))) return response({ error: "unauthorized" }, 401);

  const now = new Date().toISOString();
  const { data: due, error } = await supabase
    .from("retail_booking_reminders")
    .select("id,user_id,workspace_id,appointment_id,channel,scheduled_for,status,attempt_count,max_attempts,next_attempt_at")
    .eq("status", "scheduled")
    .lte("scheduled_for", now)
    .or(`next_attempt_at.is.null,next_attempt_at.lte.${now}`)
    .order("scheduled_for", { ascending: true })
    .limit(MAX_PER_RUN);
  if (error) return response({ error: "queue_load_failed", detail: error.message }, 500);

  const results = [];
  for (const reminder of due || []) results.push(await dispatchOne(supabase, reminder));
  return response({ ok: true, checked: results.length, results });
});
