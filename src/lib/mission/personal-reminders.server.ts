import { notifyWithOutcome } from "@/lib/notifications/notify.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Sb = { from: (table: string) => any };

export type ParsedPersonalReminder = {
  dueAt: string;
  timezone: string;
  title: string;
  body: string;
  assumedTime: boolean;
};

const REMINDER_INTENT = /\bremind(?:\s+me)?\b|\breminder\b/i;
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

export function isPersonalReminderRequest(request: string): boolean {
  return REMINDER_INTENT.test(request);
}

export function validTimeZone(value: string | null | undefined): string {
  const candidate = String(value ?? "").trim();
  if (!candidate) return "UTC";
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return "UTC";
  }
}

function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    year: Number(map["year"]),
    month: Number(map["month"]),
    day: Number(map["day"]),
    hour: Number(map["hour"]),
    minute: Number(map["minute"]),
    second: Number(map["second"]),
  };
}

function localDateTimeToUtc(args: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  timeZone: string;
}): Date {
  const desired = Date.UTC(args.year, args.month - 1, args.day, args.hour, args.minute, 0, 0);
  let guess = desired;
  for (let i = 0; i < 3; i += 1) {
    const observed = localParts(new Date(guess), args.timeZone);
    const observedAsUtc = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
      observed.second,
      0,
    );
    const delta = desired - observedAsUtc;
    if (delta === 0) break;
    guess += delta;
  }
  return new Date(guess);
}

function addLocalDays(parts: ReturnType<typeof localParts>, days: number) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function parseClock(request: string): { hour: number; minute: number; explicit: boolean } {
  const contextual = /\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i.exec(request)
    ?? /\b(\d{1,2}):(\d{2})\b/i.exec(request);
  if (!contextual) return { hour: 9, minute: 0, explicit: false };
  let hour = Number(contextual[1] ?? 0);
  const minute = Number(contextual[2] ?? 0);
  const meridiem = contextual[3]?.toLowerCase();
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) throw new Error("The reminder time is invalid.");
  return { hour, minute, explicit: true };
}

function cleanReminderBody(request: string): string {
  const trimmed = request.trim().replace(/\s+/g, " ");
  const toMatch = /\bremind(?:\s+me)?\b[\s\S]*?\bto\s+(.+)$/i.exec(trimmed);
  let body = (toMatch?.[1] ?? trimmed.replace(/^.*?\bremind(?:\s+me)?\b\s*/i, "")).trim();
  body = body
    .replace(/\s+(?:today|tomorrow)(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?\s*$/i, "")
    .replace(/\s+(?:on\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?\s*$/i, "")
    .replace(/\s+in\s+\d+\s+(?:minutes?|hours?|days?)\s*$/i, "")
    .trim();
  return body || "Reminder";
}

export function parsePersonalReminder(args: {
  request: string;
  timezone?: string | null;
  now?: Date;
}): ParsedPersonalReminder | null {
  const request = args.request.trim();
  if (!isPersonalReminderRequest(request)) return null;
  const timezone = validTimeZone(args.timezone);
  const now = args.now ?? new Date();
  const relative = /\bin\s+(\d+)\s+(minutes?|hours?|days?)\b/i.exec(request);
  let due: Date;
  let assumedTime = false;

  if (relative) {
    const amount = Number(relative[1] ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("The reminder delay is invalid.");
    const unit = (relative[2] ?? "").toLowerCase();
    const multiplier = unit.startsWith("minute") ? 60_000 : unit.startsWith("hour") ? 3_600_000 : 86_400_000;
    due = new Date(now.getTime() + amount * multiplier);
  } else {
    const nowLocal = localParts(now, timezone);
    const clock = parseClock(request);
    assumedTime = !clock.explicit;
    let target = { year: nowLocal.year, month: nowLocal.month, day: nowLocal.day };

    if (/\btomorrow\b/i.test(request)) {
      target = addLocalDays(nowLocal, 1);
    } else if (/\btoday\b/i.test(request)) {
      target = addLocalDays(nowLocal, 0);
    } else {
      const iso = /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/.exec(request);
      if (iso) {
        target = {
          year: Number(iso[1] ?? 0),
          month: Number(iso[2] ?? 0),
          day: Number(iso[3] ?? 0),
        };
      } else {
        const weekdayIndex = WEEKDAYS.findIndex((day) => new RegExp(`\\b${day}\\b`, "i").test(request));
        if (weekdayIndex >= 0) {
          const currentWeekday = new Date(Date.UTC(nowLocal.year, nowLocal.month - 1, nowLocal.day)).getUTCDay();
          let delta = (weekdayIndex - currentWeekday + 7) % 7;
          if (delta === 0) delta = 7;
          target = addLocalDays(nowLocal, delta);
        } else {
          throw new Error("I couldn't find when to send that reminder. Include today, tomorrow, a weekday, a YYYY-MM-DD date, or a delay such as ‘in 20 minutes’.");
        }
      }
    }

    due = localDateTimeToUtc({ ...target, hour: clock.hour, minute: clock.minute, timeZone: timezone });
  }

  if (!Number.isFinite(due.getTime()) || due.getTime() <= now.getTime()) {
    throw new Error("The reminder time must be in the future.");
  }
  const body = cleanReminderBody(request).slice(0, 500);
  return {
    dueAt: due.toISOString(),
    timezone,
    title: `Reminder: ${body}`.slice(0, 200),
    body,
    assumedTime,
  };
}

export async function persistPersonalReminder(args: {
  sb: Sb;
  userId: string;
  orgId?: string | null;
  taskId: string;
  parsed: ParsedPersonalReminder;
}) {
  const { data, error } = await args.sb
    .from("personal_reminders")
    .insert({
      user_id: args.userId,
      org_id: args.orgId ?? null,
      task_id: args.taskId,
      title: args.parsed.title,
      body: args.parsed.body,
      due_at: args.parsed.dueAt,
      timezone: args.parsed.timezone,
      status: "scheduled",
    })
    .select("id,due_at,timezone,status")
    .maybeSingle();
  if (error || !data) throw new Error(error?.message ?? "Could not schedule reminder.");
  return data;
}

export async function cancelPersonalReminder(sb: Sb, userId: string, taskId: string) {
  await sb
    .from("personal_reminders")
    .update({ status: "cancelled", claimed_at: null, updated_at: new Date().toISOString() })
    .eq("task_id", taskId)
    .eq("user_id", userId)
    .eq("status", "scheduled");
}

async function notificationAlreadyExists(sb: Sb, reminderId: string): Promise<boolean> {
  const { data } = await sb
    .from("notifications")
    .select("id")
    .contains("metadata", { reminder_id: reminderId })
    .limit(1);
  return Boolean(data?.length);
}

export async function processDuePersonalReminders(limit = 20) {
  const sb = supabaseAdmin as unknown as Sb;
  const now = new Date();
  const stale = new Date(now.getTime() - 10 * 60_000).toISOString();
  await sb
    .from("personal_reminders")
    .update({ status: "scheduled", claimed_at: null, updated_at: now.toISOString() })
    .eq("status", "processing")
    .lt("claimed_at", stale);

  const { data: due, error } = await sb
    .from("personal_reminders")
    .select("*")
    .eq("status", "scheduled")
    .lte("due_at", now.toISOString())
    .order("due_at", { ascending: true })
    .limit(Math.max(1, Math.min(50, Math.trunc(limit))));
  if (error) throw new Error(error.message);

  let delivered = 0;
  let failed = 0;
  for (const candidate of due ?? []) {
    const { data: claimed } = await sb
      .from("personal_reminders")
      .update({
        status: "processing",
        claimed_at: new Date().toISOString(),
        attempts: Number(candidate.attempts ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", candidate.id)
      .eq("status", "scheduled")
      .select("*")
      .maybeSingle();
    if (!claimed) continue;

    try {
      const { data: task } = await sb
        .from("personal_tasks")
        .select("id,status")
        .eq("id", claimed.task_id)
        .eq("user_id", claimed.user_id)
        .maybeSingle();
      if (!task || task.status === "cancelled") {
        await sb
          .from("personal_reminders")
          .update({ status: "cancelled", claimed_at: null, updated_at: new Date().toISOString() })
          .eq("id", claimed.id);
        continue;
      }

      const duplicate = await notificationAlreadyExists(sb, claimed.id);
      let suppressed = false;
      if (!duplicate) {
        const outcome = await notifyWithOutcome({
          userId: claimed.user_id,
          orgId: claimed.org_id ?? null,
          type: "reminder.due",
          title: claimed.title,
          body: claimed.body,
          link: "/mission-control",
          metadata: { reminder_id: claimed.id, task_id: claimed.task_id, due_at: claimed.due_at },
        });
        if (outcome === "failed") throw new Error("Reminder notification could not be emitted.");
        suppressed = outcome === "suppressed";
      }

      const completedAt = new Date().toISOString();
      await sb
        .from("personal_reminders")
        .update({
          status: "delivered",
          delivered_at: completedAt,
          claimed_at: null,
          last_error: suppressed ? "Notification suppressed by user preferences." : null,
          updated_at: completedAt,
        })
        .eq("id", claimed.id)
        .eq("status", "processing");
      await sb
        .from("personal_tasks")
        .update({
          status: "completed",
          completed_at: completedAt,
          result: {
            reminder_delivered: !suppressed,
            reminder_suppressed: suppressed,
            reminder_id: claimed.id,
            due_at: claimed.due_at,
          },
        })
        .eq("id", claimed.task_id)
        .eq("user_id", claimed.user_id)
        .neq("status", "cancelled");
      delivered += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message.slice(0, 500) : "Reminder delivery failed.";
      const attempts = Number(claimed.attempts ?? 1);
      const terminal = attempts >= 3;
      await sb
        .from("personal_reminders")
        .update({
          status: terminal ? "failed" : "scheduled",
          claimed_at: null,
          last_error: message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", claimed.id)
        .eq("status", "processing");
      if (terminal) {
        await sb
          .from("personal_tasks")
          .update({
            status: "failed",
            result: { error: "The reminder could not be delivered after multiple attempts." },
          })
          .eq("id", claimed.task_id)
          .eq("user_id", claimed.user_id)
          .neq("status", "cancelled");
      }
      failed += 1;
    }
  }
  return { scanned: due?.length ?? 0, delivered, failed };
}
