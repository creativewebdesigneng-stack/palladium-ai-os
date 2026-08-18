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
