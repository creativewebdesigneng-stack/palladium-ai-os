import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CREDENTIAL = "retail_booking_reminder_dispatch";
const MAX_PER_RUN = 50;
const KIND = "retail.booking_reminder";
const CLAIM_LEASE_MS = 15 * 60 * 1000;
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

function textEnv(name: string): string {
  return (Deno.env.get(name) || "").trim();
}
function e164(value: unknown): string {
  const normalized = typeof value === "string" ? value.trim().replace(/[\s().-]/g, "") : "";
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : "";
}
function appOrigin(): string | null {
  const base = textEnv("RETAIL_APP_ORIGIN") || textEnv("APP_ORIGIN");
  if (!base) return null;
  try {
    const url = new URL(base);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}
function callbackUrl(): string | null {
  const base = textEnv("TWILIO_STATUS_CALLBACK_BASE_URL") || appOrigin();
  if (!base) return null;
  try {
    const url = new URL("/api/public/retail/twilio-status", base);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
function emailBridgeUrl(): string | null {
  const base = appOrigin();
  if (!base) return null;
  try {
    return new URL("/api/internal/retail-booking-reminder-email", base).toString();
  } catch {
    return null;
  }
}
type TwilioConfig = {
  accountSid: string;
  authToken: string;
  smsFrom: string;
  messagingServiceSid: string;
  whatsappFrom: string;
};
function twilioConfig(): TwilioConfig | null {
  const accountSid = textEnv("TWILIO_ACCOUNT_SID");
  const authToken = textEnv("TWILIO_AUTH_TOKEN");
  if (!accountSid || !authToken) return null;
  return {
    accountSid,
    authToken,
    smsFrom: textEnv("TWILIO_SMS_FROM_NUMBER"),
    messagingServiceSid: textEnv("TWILIO_MESSAGING_SERVICE_SID"),
    whatsappFrom: textEnv("TWILIO_WHATSAPP_FROM"),
  };
}
function deliveryCapabilities() {
  const config = twilioConfig();
  return {
    sms: Boolean(config && (config.smsFrom || config.messagingServiceSid)),
    whatsapp: Boolean(config && config.whatsappFrom),
    email_bridge: Boolean(emailBridgeUrl()),
  };
}
function formatAppointmentTime(value: string, timezone: string): string {
  const date = new Date(value);
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone || "Europe/London",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}
function reminderBody(appointment: any, workspace: any, serviceName: string | null): string {
  const customer = String(appointment.customer_name || "there").trim().slice(0, 100) || "there";
  const business = String(workspace.business_name || "the business").trim().slice(0, 120) || "the business";
  const when = formatAppointmentTime(String(appointment.starts_at), String(workspace.timezone || "Europe/London"));
  const service = serviceName ? ` for ${serviceName.slice(0, 100)}` : "";
  return `Hi ${customer}, reminder: your appointment${service} at ${business} is ${when}. If you need to change it, please contact ${business}.`;
}
function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function safeProviderError(body: Record<string, unknown>, status: number): string {
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const code = body.code === undefined || body.code === null ? "" : String(body.code);
  return `${code ? `Twilio ${code}` : `Twilio HTTP ${status}`}${message ? `: ${message}` : ": provider rejected the request."}`.slice(0, 1800);
}

async function getReminderCommunication(supabase: any, reminder: any) {
  const { data, error } = await supabase
    .from("retail_customer_communications")
    .select("id,status,provider_message_id,metadata")
    .eq("user_id", reminder.user_id)
    .eq("workspace_id", reminder.workspace_id)
    .eq("appointment_id", reminder.appointment_id)
    .contains("metadata", { retail_booking_reminder_id: reminder.id })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`communication_dedupe_failed:${error.message}`);
  return data;
}

async function dispatchConnectedEmailReminder(supabase: any, reminder: any, schedulerToken: string) {
  const bridge = emailBridgeUrl();
  if (!bridge) {
    await updateReminder(supabase, reminder.id, {
      status: "skipped",
      next_attempt_at: null,
      last_error: "provider_not_configured:email_bridge",
    });
    return { id: reminder.id, status: "skipped", channel: "email", reason: "provider_not_configured:email_bridge" };
  }

  let bridgeResponse: Response;
  try {
    bridgeResponse = await fetch(bridge, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${schedulerToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ reminder_id: reminder.id }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch (error) {
    const { data: current } = await supabase
      .from("retail_booking_reminders")
      .select("status,provider_message_id,last_error")
      .eq("id", reminder.id)
      .maybeSingle();
    if (current?.status === "sent") {
      return { id: reminder.id, status: "sent", channel: "email", reconciled: true, provider_message_id: current.provider_message_id || null };
    }
    const reason = error instanceof Error ? `email_bridge_outcome_unknown:${error.message}` : "email_bridge_outcome_unknown";
    await updateReminder(supabase, reminder.id, { status: "failed", next_attempt_at: null, last_error: reason.slice(0, 1800) });
    return { id: reminder.id, status: "failed", channel: "email", reason: "email_bridge_outcome_unknown" };
  }

  const raw = (await bridgeResponse.text()).slice(0, 12_000);
  let payload: Record<string, unknown> = {};
  if (raw) {
    try { payload = JSON.parse(raw) as Record<string, unknown>; }
    catch { payload = {}; }
  }

  const { data: current, error: currentError } = await supabase
    .from("retail_booking_reminders")
    .select("status,provider_message_id,last_error")
    .eq("id", reminder.id)
    .maybeSingle();
  if (currentError) throw new Error(`email_bridge_reconcile_failed:${currentError.message}`);
  if (current?.status === "sent") {
    return { id: reminder.id, status: "sent", channel: "email", reconciled: true, provider_message_id: current.provider_message_id || null };
  }
  if (["failed", "skipped", "cancelled"].includes(String(current?.status || ""))) {
    return { id: reminder.id, status: String(current.status), channel: "email", reason: current.last_error || null };
  }

  if (!bridgeResponse.ok) {
    const reason = `email_bridge_rejected:${bridgeResponse.status}`;
    await updateReminder(supabase, reminder.id, { status: "failed", next_attempt_at: null, last_error: reason });
    return { id: reminder.id, status: "failed", channel: "email", reason };
  }

  const result = objectValue(payload.result);
  const status = typeof result.status === "string" ? result.status : "failed";
  if (status === "sent" || status === "reconciled") {
    const providerMessageId = typeof result.provider_message_id === "string" ? result.provider_message_id : null;
    await updateReminder(supabase, reminder.id, {
      status: "sent",
      next_attempt_at: null,
      ...(providerMessageId ? { provider_message_id: providerMessageId } : {}),
      last_error: null,
    });
    return { id: reminder.id, status: "sent", channel: "email", provider: result.provider || null, provider_message_id: providerMessageId };
  }

  const reason = typeof result.reason === "string" ? result.reason.slice(0, 1800) : "email_bridge_did_not_finalize";
  await updateReminder(supabase, reminder.id, { status: status === "skipped" ? "skipped" : "failed", next_attempt_at: null, last_error: reason });
  return { id: reminder.id, status: status === "skipped" ? "skipped" : "failed", channel: "email", reason };
}

async function dispatchTwilioReminder(supabase: any, reminder: any, appointment: any, workspace: any, nextAttempt: number) {
  const config = twilioConfig();
  const capabilities = deliveryCapabilities();
  const channel = String(reminder.channel);
  if (!config || (channel === "sms" && !capabilities.sms) || (channel === "whatsapp" && !capabilities.whatsapp)) {
    await updateReminder(supabase, reminder.id, {
      status: "skipped",
      next_attempt_at: null,
      last_error: `provider_not_configured:${channel}`,
    });
    return { id: reminder.id, status: "skipped", channel, reason: `provider_not_configured:${channel}` };
  }

  const recipient = e164(appointment.customer_phone);
  if (!recipient) {
    await updateReminder(supabase, reminder.id, {
      status: "skipped",
      next_attempt_at: null,
      last_error: "customer_phone_missing_or_invalid_e164",
    });
    return { id: reminder.id, status: "skipped", channel, reason: "customer_phone_missing_or_invalid_e164" };
  }

  let serviceName: string | null = null;
  if (appointment.service_item_id) {
    const { data: service, error: serviceError } = await supabase
      .from("retail_catalog_items")
      .select("name")
      .eq("id", appointment.service_item_id)
      .eq("workspace_id", reminder.workspace_id)
      .eq("user_id", reminder.user_id)
      .maybeSingle();
    if (serviceError) throw new Error(`service_load_failed:${serviceError.message}`);
    serviceName = typeof service?.name === "string" ? service.name : null;
  }

  const body = reminderBody(appointment, workspace, serviceName);
  let communication = await getReminderCommunication(supabase, reminder);
  const previousMetadata = objectValue(communication?.metadata);

  if (communication?.status === "sent" && communication.provider_message_id) {
    await updateReminder(supabase, reminder.id, {
      status: "sent",
      next_attempt_at: null,
      sent_at: reminder.sent_at || new Date().toISOString(),
      provider_message_id: communication.provider_message_id,
      last_error: null,
    });
    return { id: reminder.id, status: "sent", channel, provider_accepted: true, reconciled: true };
  }

  if (communication?.status === "ready" && previousMetadata.provider_call_started_at) {
    await updateReminder(supabase, reminder.id, {
      status: "failed",
      next_attempt_at: null,
      last_error: "provider_outcome_unknown:existing_inflight_communication",
    });
    return { id: reminder.id, status: "failed", channel, reason: "provider_outcome_unknown" };
  }

  const callback = callbackUrl();
  const startedAt = new Date().toISOString();
  if (!communication) {
    const { data, error } = await supabase
      .from("retail_customer_communications")
      .insert({
        user_id: reminder.user_id,
        workspace_id: reminder.workspace_id,
        appointment_id: reminder.appointment_id,
        direction: "outbound",
        channel,
        purpose: "appointment_confirmation",
        recipient,
        subject: null,
        body,
        scheduled_for: reminder.scheduled_for,
        status: "ready",
        provider: "twilio",
        metadata: {
          source: "retail_booking_reminder",
          retail_booking_reminder_id: reminder.id,
          provider_delivery_required: true,
          provider_accepted: false,
          delivery_confirmed: false,
          status_callback_configured: Boolean(callback),
          provider_call_started_at: startedAt,
          attempt: nextAttempt,
        },
      })
      .select("id,status,provider_message_id,metadata")
      .single();
    if (error || !data) throw new Error(`communication_insert_failed:${error?.message || "missing_row"}`);
    communication = data;
  } else {
    const { data, error } = await supabase
      .from("retail_customer_communications")
      .update({
        status: "ready",
        provider: "twilio",
        provider_message_id: null,
        sent_at: null,
        delivered_at: null,
        last_error: null,
        recipient,
        body,
        metadata: {
          ...previousMetadata,
          source: "retail_booking_reminder",
          retail_booking_reminder_id: reminder.id,
          provider_delivery_required: true,
          provider_accepted: false,
          delivery_confirmed: false,
          status_callback_configured: Boolean(callback),
          provider_call_started_at: startedAt,
          provider_outcome_unknown: false,
          provider_rejected: false,
          attempt: nextAttempt,
        },
        updated_at: startedAt,
      })
      .eq("id", communication.id)
      .eq("user_id", reminder.user_id)
      .eq("status", "failed")
      .select("id,status,provider_message_id,metadata")
      .maybeSingle();
    if (error) throw new Error(`communication_retry_claim_failed:${error.message}`);
    if (!data) {
      await updateReminder(supabase, reminder.id, { status: "failed", next_attempt_at: null, last_error: "communication_not_retryable" });
      return { id: reminder.id, status: "failed", channel, reason: "communication_not_retryable" };
    }
    communication = data;
  }

  const params = new URLSearchParams();
  params.set("To", channel === "whatsapp" ? `whatsapp:${recipient}` : recipient);
  params.set("Body", body);
  if (channel === "whatsapp") {
    const from = config.whatsappFrom.startsWith("whatsapp:") ? config.whatsappFrom : `whatsapp:${config.whatsappFrom}`;
    params.set("From", from);
  } else if (config.messagingServiceSid) {
    params.set("MessagingServiceSid", config.messagingServiceSid);
  } else {
    params.set("From", config.smsFrom);
  }
  if (callback) params.set("StatusCallback", callback);

  let providerResponse: Response;
  let providerBody: Record<string, unknown> = {};
  try {
    providerResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${config.accountSid}:${config.authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: params.toString(),
      signal: AbortSignal.timeout(15_000),
    });
    const raw = await providerResponse.text();
    if (raw) {
      try { providerBody = JSON.parse(raw) as Record<string, unknown>; }
      catch { providerBody = {}; }
    }
  } catch (error) {
    const reason = error instanceof Error ? `provider_outcome_unknown:${error.message}` : "provider_outcome_unknown";
    await supabase
      .from("retail_customer_communications")
      .update({
        status: "failed",
        last_error: reason.slice(0, 1800),
        metadata: {
          ...objectValue(communication.metadata),
          provider_outcome_unknown: true,
          provider_delivery_required: false,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", communication.id)
      .eq("user_id", reminder.user_id);
    await updateReminder(supabase, reminder.id, { status: "failed", next_attempt_at: null, last_error: reason.slice(0, 1800) });
    return { id: reminder.id, status: "failed", channel, reason: "provider_outcome_unknown" };
  }

  const providerSid = typeof providerBody.sid === "string" ? providerBody.sid.trim().slice(0, 500) : "";
  const providerStatus = typeof providerBody.status === "string" ? providerBody.status.trim().slice(0, 120) : "";
  if (!providerResponse.ok || !providerSid) {
    const reason = safeProviderError(providerBody, providerResponse.status);
    const retryable = providerResponse.status === 429 || providerResponse.status >= 500;
    await supabase
      .from("retail_customer_communications")
      .update({
        status: "failed",
        last_error: reason,
        metadata: {
          ...objectValue(communication.metadata),
          provider_rejected: true,
          provider_http_status: providerResponse.status,
          provider_delivery_required: false,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", communication.id)
      .eq("user_id", reminder.user_id);
    const terminal = !retryable || nextAttempt >= Number(reminder.max_attempts || 5);
    await updateReminder(supabase, reminder.id, {
      status: terminal ? "failed" : "scheduled",
      next_attempt_at: terminal ? null : backoffIso(nextAttempt),
      last_error: reason,
    });
    return { id: reminder.id, status: terminal ? "failed" : "retry", channel, reason };
  }

  const acceptedAt = new Date().toISOString();
  const { error: communicationFinalizeError } = await supabase
    .from("retail_customer_communications")
    .update({
      status: "sent",
      provider: "twilio",
      provider_message_id: providerSid,
      sent_at: acceptedAt,
      delivered_at: null,
      last_error: null,
      metadata: {
        ...objectValue(communication.metadata),
        provider_delivery_required: false,
        provider_accepted: true,
        provider_status: providerStatus || "accepted",
        delivery_confirmed: false,
        provider_accepted_at: acceptedAt,
      },
      updated_at: acceptedAt,
    })
    .eq("id", communication.id)
    .eq("user_id", reminder.user_id)
    .eq("status", "ready");

  if (communicationFinalizeError) {
    await updateReminder(supabase, reminder.id, {
      status: "failed",
      next_attempt_at: null,
      last_error: "provider_accepted_but_ledger_finalize_failed",
      provider_message_id: providerSid,
    });
    return { id: reminder.id, status: "failed", channel, provider_accepted: true, reason: "ledger_finalize_failed" };
  }

  await updateReminder(supabase, reminder.id, {
    status: "sent",
    next_attempt_at: null,
    sent_at: acceptedAt,
    provider_message_id: providerSid,
    last_error: null,
  });
  return {
    id: reminder.id,
    status: "sent",
    channel,
    provider: "twilio",
    provider_accepted: true,
    provider_status: providerStatus || "accepted",
    delivery_confirmed: false,
    status_callback_configured: Boolean(callback),
  };
}

async function dispatchOne(supabase: any, reminder: any, schedulerToken: string) {
  const now = new Date().toISOString();
  if (Number(reminder.attempt_count || 0) >= Number(reminder.max_attempts || 5)) {
    await updateReminder(supabase, reminder.id, { status: "failed", next_attempt_at: null, last_error: "max_attempts_exhausted" });
    return { id: reminder.id, status: "failed", reason: "max_attempts_exhausted" };
  }

  // A lease in next_attempt_at makes the scheduled row invisible to overlapping cron runs.
  // Unknown provider outcomes are never automatically retried, preserving at-most-once sends.
  const nextAttempt = Number(reminder.attempt_count || 0) + 1;
  const leaseUntil = new Date(Date.now() + CLAIM_LEASE_MS).toISOString();
  const { data: claimed, error: claimError } = await supabase
    .from("retail_booking_reminders")
    .update({ attempt_count: nextAttempt, last_attempt_at: now, next_attempt_at: leaseUntil, updated_at: now })
    .eq("id", reminder.id)
    .eq("status", "scheduled")
    .eq("attempt_count", Number(reminder.attempt_count || 0))
    .select("id")
    .maybeSingle();
  if (claimError) throw new Error(`claim_failed:${claimError.message}`);
  if (!claimed) return { id: reminder.id, status: "skipped", reason: "already_claimed" };

  try {
    const [{ data: appointment, error: appointmentError }, { data: workspace, error: workspaceError }] = await Promise.all([
      supabase.from("retail_appointments").select("id,customer_name,customer_phone,customer_email,starts_at,status,service_item_id").eq("id", reminder.appointment_id).eq("user_id", reminder.user_id).maybeSingle(),
      supabase.from("retail_workspaces").select("id,business_name,timezone").eq("id", reminder.workspace_id).eq("user_id", reminder.user_id).maybeSingle(),
    ]);
    if (appointmentError) throw new Error(`appointment_load_failed:${appointmentError.message}`);
    if (workspaceError) throw new Error(`workspace_load_failed:${workspaceError.message}`);
    if (!appointment || !workspace) {
      await updateReminder(supabase, reminder.id, { status: "skipped", next_attempt_at: null, last_error: "appointment_or_workspace_missing" });
      return { id: reminder.id, status: "skipped", reason: "appointment_or_workspace_missing" };
    }
    if (["completed", "cancelled", "no_show"].includes(String(appointment.status))) {
      await updateReminder(supabase, reminder.id, { status: "skipped", next_attempt_at: null, last_error: `appointment_${appointment.status}` });
      return { id: reminder.id, status: "skipped", reason: `appointment_${appointment.status}` };
    }
    if (new Date(appointment.starts_at).getTime() <= Date.now()) {
      await updateReminder(supabase, reminder.id, { status: "skipped", next_attempt_at: null, last_error: "appointment_already_started" });
      return { id: reminder.id, status: "skipped", reason: "appointment_already_started" };
    }

    if (["sms", "whatsapp"].includes(String(reminder.channel))) {
      return await dispatchTwilioReminder(supabase, reminder, appointment, workspace, nextAttempt);
    }
    if (reminder.channel === "email") {
      return await dispatchConnectedEmailReminder(supabase, reminder, schedulerToken);
    }

    if (reminder.channel !== "in_app") {
      await updateReminder(supabase, reminder.id, { status: "skipped", next_attempt_at: null, last_error: `provider_not_configured:${reminder.channel}` });
      return { id: reminder.id, status: "skipped", reason: `provider_not_configured:${reminder.channel}` };
    }

    if (!(await preferenceAllows(supabase, reminder.user_id))) {
      await updateReminder(supabase, reminder.id, { status: "skipped", next_attempt_at: null, last_error: "notification_preferences_suppressed" });
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

    await updateReminder(supabase, reminder.id, { status: "sent", sent_at: now, next_attempt_at: null, last_error: null, provider_message_id: `in_app:${reminder.id}` });
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
  const schedulerToken = bearer(req);
  if (!(await authorized(supabase, req))) return response({ error: "unauthorized" }, 401);

  const now = new Date().toISOString();
  const { data: due, error } = await supabase
    .from("retail_booking_reminders")
    .select("id,user_id,workspace_id,appointment_id,channel,scheduled_for,status,attempt_count,max_attempts,next_attempt_at,sent_at")
    .eq("status", "scheduled")
    .lte("scheduled_for", now)
    .or(`next_attempt_at.is.null,next_attempt_at.lte.${now}`)
    .order("scheduled_for", { ascending: true })
    .limit(MAX_PER_RUN);
  if (error) return response({ error: "queue_load_failed", detail: error.message }, 500);

  const results = [];
  for (const reminder of due || []) results.push(await dispatchOne(supabase, reminder, schedulerToken));
  return response({ ok: true, checked: results.length, capabilities: deliveryCapabilities(), results });
});