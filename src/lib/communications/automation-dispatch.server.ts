import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { writeAudit } from "@/lib/platform/audit.server";
import {
  communicationPreferencesSchema,
  DEFAULT_COMMUNICATION_PREFERENCES,
  isInsideQuietHours,
  purposeEnabled,
  type CommunicationPreferences,
  type CommunicationPurpose,
} from "./contracts";
import { phoneAutomationPolicy } from "./automation-policy";
import {
  communicationsPublicUrl,
  communicationsRuntimeCapabilities,
  sendTwilioSms,
  startTwilioAiCall,
} from "./twilio-provider.server";

type Db = {
  from: (table: string) => any;
  rpc: (name: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;
};

const db = supabaseAdmin as unknown as Db;

type NotificationRow = {
  id: string;
  user_id: string;
  kind: string;
  severity: string;
  title: string;
  body: string | null;
  link: string | null;
  metadata: Record<string, unknown> | null;
};

type JobRow = {
  id: string;
  notification_id: string;
  user_id: string;
  attempts: number;
};

type ChannelOutcome = "sent" | "suppressed" | "unavailable" | "failed";

type DispatchResult = {
  purpose: CommunicationPurpose;
  push: ChannelOutcome;
  sms: ChannelOutcome;
  voice: ChannelOutcome;
};

function preferencesFromRow(row: any): CommunicationPreferences {
  if (!row) return DEFAULT_COMMUNICATION_PREFERENCES;
  return communicationPreferencesSchema.parse({
    phone_push_enabled: row.phone_push_enabled ?? true,
    sms_enabled: row.sms_enabled ?? false,
    ai_calls_enabled: row.ai_calls_enabled ?? false,
    project_updates: row.project_updates ?? true,
    agent_updates: row.agent_updates ?? true,
    business_updates: row.business_updates ?? true,
    quiet_hours_start: row.quiet_hours_start ? String(row.quiet_hours_start).slice(0, 5) : null,
    quiet_hours_end: row.quiet_hours_end ? String(row.quiet_hours_end).slice(0, 5) : null,
    timezone: row.timezone ?? "UTC",
    max_daily_sms: Number(row.max_daily_sms ?? 10),
    max_daily_calls: Number(row.max_daily_calls ?? 3),
    retain_call_transcript: row.retain_call_transcript ?? false,
  });
}

async function loadPreferences(userId: string) {
  const result = await db.from("communication_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return preferencesFromRow(result.data);
}

async function loadRecipients(userId: string) {
  const result = await db.from("communication_recipients")
    .select("id,phone_e164,verified_at,sms_consent_at,voice_consent_at,created_at")
    .eq("user_id", userId)
    .is("disabled_at", null)
    .order("created_at", { ascending: true });
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as Array<{
    id: string;
    phone_e164: string;
    verified_at: string | null;
    sms_consent_at: string | null;
    voice_consent_at: string | null;
  }>;
}

async function belowDailyLimit(userId: string, channel: "sms" | "voice", limit: number) {
  if (limit <= 0) return false;
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const result = await db.from("communication_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("channel", channel)
    .gte("created_at", since)
    .neq("status", "cancelled");
  if (result.error) throw new Error(result.error.message);
  return Number(result.count ?? 0) < limit;
}

function notificationBody(notification: NotificationRow) {
  const body = notification.body?.trim();
  return body ? `${notification.title}: ${body}`.slice(0, 1500) : notification.title.slice(0, 1500);
}

async function sendPush(notification: NotificationRow, purpose: CommunicationPurpose): Promise<ChannelOutcome> {
  const endpoints = await db.from("notification_endpoints")
    .select("topic")
    .eq("user_id", notification.user_id)
    .eq("provider", "ntfy")
    .eq("enabled", true);
  if (endpoints.error) throw new Error(endpoints.error.message);
  if (!endpoints.data?.length) return "suppressed";

  const base = (process.env["NTFY_BASE_URL"]?.trim() || "https://ntfy.sh").replace(/\/+$/, "");
  const token = process.env["NTFY_TOKEN"]?.trim();
  let delivered = 0;
  for (const endpoint of endpoints.data) {
    const topic = typeof endpoint.topic === "string" ? endpoint.topic.trim() : "";
    if (!topic) continue;
    try {
      const response = await fetch(`${base}/${encodeURIComponent(topic)}`, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          Title: notification.title.slice(0, 160),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: notification.body?.slice(0, 1000) || notification.title.slice(0, 1000),
        signal: AbortSignal.timeout(10_000),
      });
      if (response.ok) delivered += 1;
    } catch {
      // Continue to the user's other registered phone endpoints.
    }
  }
  if (!delivered) return "failed";

  const now = new Date().toISOString();
  const event = await db.from("communication_events").insert({
    user_id: notification.user_id,
    channel: "push",
    purpose,
    source_type: "notification",
    source_id: notification.id,
    title: notification.title.slice(0, 160),
    body: notification.body?.slice(0, 1000) ?? null,
    status: "sent",
    provider: "ntfy",
    sent_at: now,
    metadata: { endpoints_sent: delivered, notification_kind: notification.kind },
  }).select("id").single();
  if (event.error) throw new Error(event.error.message);
  await writeAudit({
    userId: notification.user_id,
    action: "communications.automated_phone_push_sent",
    targetType: "communication_event",
    targetId: event.data?.id,
    status: "success",
    metadata: { notificationId: notification.id, purpose, endpoints: delivered },
  });
  return "sent";
}

async function sendSms(
  notification: NotificationRow,
  purpose: CommunicationPurpose,
  recipient: { id: string; phone_e164: string },
): Promise<ChannelOutcome> {
  const event = await db.from("communication_events").insert({
    user_id: notification.user_id,
    recipient_id: recipient.id,
    channel: "sms",
    purpose,
    source_type: "notification",
    source_id: notification.id,
    body: notificationBody(notification),
    status: "sending",
    provider: "twilio",
    metadata: { initiated_by: "blackstar_automation", notification_kind: notification.kind },
  }).select("*").single();
  if (event.error || !event.data) throw new Error(event.error?.message || "Automated SMS event could not be created.");

  try {
    const provider = await sendTwilioSms({
      to: recipient.phone_e164,
      body: notificationBody(notification),
      statusCallbackUrl: communicationsPublicUrl("/api/public/communications/twilio/message-status"),
    });
    const now = new Date().toISOString();
    await db.from("communication_events").update({
      status: "sent",
      provider_id: provider.sid,
      sent_at: now,
      updated_at: now,
      metadata: {
        initiated_by: "blackstar_automation",
        notification_kind: notification.kind,
        provider_status: provider.status,
      },
    }).eq("id", event.data.id);
    await writeAudit({
      userId: notification.user_id,
      action: "communications.automated_sms_sent",
      targetType: "communication_event",
      targetId: event.data.id,
      status: "success",
      metadata: { notificationId: notification.id, purpose },
    });
    return "sent";
  } catch (error) {
    const message = error instanceof Error ? error.message : "Automated SMS failed.";
    await db.from("communication_events").update({
      status: "failed",
      error: message.slice(0, 1000),
      updated_at: new Date().toISOString(),
    }).eq("id", event.data.id);
    return "failed";
  }
}

async function startVoiceCall(
  notification: NotificationRow,
  purpose: CommunicationPurpose,
  recipient: { id: string; phone_e164: string },
  retainTranscript: boolean,
): Promise<ChannelOutcome> {
  const objective = [
    `Tell the user about this Blackstar update: ${notification.title}.`,
    notification.body ? notification.body.slice(0, 900) : "",
    "Then answer concise questions using their current Blackstar workspace context.",
    "Do not execute purchases, deployments, account changes or other consequential actions during the call.",
  ].filter(Boolean).join(" ").slice(0, 2000);

  const event = await db.from("communication_events").insert({
    user_id: notification.user_id,
    recipient_id: recipient.id,
    channel: "voice",
    purpose,
    source_type: "notification",
    source_id: notification.id,
    call_objective: objective,
    status: "queued",
    provider: "twilio",
    metadata: {
      initiated_by: "blackstar_automation",
      notification_kind: notification.kind,
      ai_disclosure_required: true,
    },
  }).select("*").single();
  if (event.error || !event.data) throw new Error(event.error?.message || "Automated call event could not be created.");

  const session = await db.from("communication_call_sessions").insert({
    event_id: event.data.id,
    user_id: notification.user_id,
    provider: "twilio",
    status: "queued",
    call_objective: objective,
    retain_transcript: retainTranscript,
    history: [],
  }).select("*").single();
  if (session.error || !session.data) {
    await db.from("communication_events").update({ status: "failed", error: session.error?.message ?? "Call session could not be created." }).eq("id", event.data.id);
    return "failed";
  }

  try {
    const provider = await startTwilioAiCall({ to: recipient.phone_e164, sessionId: session.data.id });
    const now = new Date().toISOString();
    await Promise.all([
      db.from("communication_call_sessions").update({
        provider_call_sid: provider.sid,
        status: "queued",
        updated_at: now,
      }).eq("id", session.data.id),
      db.from("communication_events").update({
        provider_id: provider.sid,
        status: "queued",
        updated_at: now,
        metadata: {
          initiated_by: "blackstar_automation",
          notification_kind: notification.kind,
          ai_disclosure_required: true,
          provider_status: provider.status,
        },
      }).eq("id", event.data.id),
    ]);
    await writeAudit({
      userId: notification.user_id,
      action: "communications.automated_ai_call_started",
      targetType: "communication_event",
      targetId: event.data.id,
      status: "success",
      metadata: { notificationId: notification.id, purpose },
    });
    return "sent";
  } catch (error) {
    const message = error instanceof Error ? error.message : "Automated AI call failed.";
    const now = new Date().toISOString();
    await Promise.all([
      db.from("communication_call_sessions").update({ status: "failed", ended_at: now, updated_at: now, history: [] }).eq("id", session.data.id),
      db.from("communication_events").update({ status: "failed", error: message.slice(0, 1000), completed_at: now, updated_at: now }).eq("id", event.data.id),
    ]);
    return "failed";
  }
}

async function completeJob(jobId: string, result: DispatchResult) {
  const now = new Date().toISOString();
  const updated = await db.from("communication_notification_jobs").update({
    status: "completed",
    result,
    completed_at: now,
    updated_at: now,
    last_error: null,
  }).eq("id", jobId).eq("status", "processing");
  if (updated.error) throw new Error(updated.error.message);
}

async function failJob(job: JobRow, error: unknown) {
  const message = error instanceof Error ? error.message : "Phone communication notification dispatch failed.";
  const delayMinutes = Math.min(60, 2 ** Math.max(0, job.attempts));
  const retryAt = new Date(Date.now() + delayMinutes * 60_000).toISOString();
  await db.from("communication_notification_jobs").update({
    status: "failed",
    available_at: retryAt,
    updated_at: new Date().toISOString(),
    last_error: message.slice(0, 1000),
  }).eq("id", job.id).eq("status", "processing");
}

async function processJob(job: JobRow): Promise<DispatchResult> {
  const notificationResult = await db.from("notifications")
    .select("id,user_id,kind,severity,title,body,link,metadata")
    .eq("id", job.notification_id)
    .eq("user_id", job.user_id)
    .maybeSingle();
  if (notificationResult.error) throw new Error(notificationResult.error.message);
  if (!notificationResult.data) {
    const missing: DispatchResult = { purpose: "custom", push: "suppressed", sms: "suppressed", voice: "suppressed" };
    await completeJob(job.id, missing);
    return missing;
  }

  const notification = notificationResult.data as NotificationRow;
  const policy = phoneAutomationPolicy(notification.kind, notification.severity);
  const prefs = await loadPreferences(notification.user_id);
  const result: DispatchResult = { purpose: policy.purpose, push: "suppressed", sms: "suppressed", voice: "suppressed" };

  if (!purposeEnabled(prefs, policy.purpose)) {
    await completeJob(job.id, result);
    return result;
  }

  if (policy.push && prefs.phone_push_enabled) {
    result.push = await sendPush(notification, policy.purpose);
  }

  const quiet = isInsideQuietHours(
    new Date(),
    prefs.timezone,
    prefs.quiet_hours_start,
    prefs.quiet_hours_end,
  );
  if (!quiet) {
    const recipients = await loadRecipients(notification.user_id);
    const capabilities = communicationsRuntimeCapabilities();

    if (policy.sms && prefs.sms_enabled) {
      const recipient = recipients.find((item) => item.verified_at && item.sms_consent_at);
      if (!capabilities.sms) result.sms = "unavailable";
      else if (!recipient) result.sms = "suppressed";
      else if (!(await belowDailyLimit(notification.user_id, "sms", prefs.max_daily_sms))) result.sms = "suppressed";
      else result.sms = await sendSms(notification, policy.purpose, recipient);
    }

    if (policy.voice && prefs.ai_calls_enabled) {
      const recipient = recipients.find((item) => item.verified_at && item.voice_consent_at);
      if (!capabilities.ai_voice_calls) result.voice = "unavailable";
      else if (!recipient) result.voice = "suppressed";
      else if (!(await belowDailyLimit(notification.user_id, "voice", prefs.max_daily_calls))) result.voice = "suppressed";
      else result.voice = await startVoiceCall(notification, policy.purpose, recipient, prefs.retain_call_transcript);
    }
  }

  await completeJob(job.id, result);
  return result;
}

export async function processDuePhoneCommunicationNotifications(limit = 10) {
  const boundedLimit = Math.max(1, Math.min(25, Math.trunc(limit || 10)));
  const claimed = await db.rpc("claim_phone_communication_notification_jobs", { max_jobs: boundedLimit });
  if (claimed.error) throw new Error(claimed.error.message);
  const jobs = (claimed.data ?? []) as JobRow[];
  let completed = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      await processJob(job);
      completed += 1;
    } catch (error) {
      failed += 1;
      await failJob(job, error);
      console.error("[communications] automated notification dispatch failed", {
        jobId: job.id,
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
    }
  }

  return { claimed: jobs.length, completed, failed };
}
