const MAX_LOOKAHEAD_MINUTES = 60 * 24 * 370;

type CronField = { matches: (value: number) => boolean };

function parsePart(part: string, min: number, max: number): Set<number> {
  const out = new Set<number>();
  const [rangeText, stepText] = part.split('/');
  const step = stepText ? Number(stepText) : 1;
  if (!Number.isInteger(step) || step < 1) throw new Error('Cron step must be a positive integer.');

  let start = min;
  let end = max;
  if (rangeText && rangeText !== '*') {
    if (rangeText.includes('-')) {
      const [a, b] = rangeText.split('-').map(Number);
      if (!Number.isInteger(a) || !Number.isInteger(b)) throw new Error('Cron range is invalid.');
      start = a!;
      end = b!;
    } else {
      const value = Number(rangeText);
      if (!Number.isInteger(value)) throw new Error('Cron value is invalid.');
      start = value;
      end = value;
    }
  }
  if (start < min || end > max || start > end) throw new Error('Cron value is outside its allowed range.');
  for (let value = start; value <= end; value += step) out.add(value);
  return out;
}

function parseField(text: string, min: number, max: number): CronField {
  const values = new Set<number>();
  for (const part of text.split(',')) {
    for (const value of parsePart(part.trim(), min, max)) values.add(value);
  }
  return { matches: (value) => values.has(value) };
}

function localParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    minute: '2-digit',
    hour: '2-digit',
    day: '2-digit',
    month: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return {
    minute: Number(get('minute')),
    hour: Number(get('hour')),
    day: Number(get('day')),
    month: Number(get('month')),
    weekday,
  };
}

export function nextCronRun(cron: string, timezone: string, after = new Date()): Date {
  const fields = cron.trim().split(/\s+/);
  if (fields.length !== 5) throw new Error('Use a standard five-field cron expression.');
  const minute = parseField(fields[0]!, 0, 59);
  const hour = parseField(fields[1]!, 0, 23);
  const day = parseField(fields[2]!, 1, 31);
  const month = parseField(fields[3]!, 1, 12);
  const weekday = parseField(fields[4]!, 0, 6);

  // Validate timezone before scanning.
  localParts(after, timezone);
  const cursor = new Date(after.getTime());
  cursor.setUTCSeconds(0, 0);
  cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  for (let i = 0; i < MAX_LOOKAHEAD_MINUTES; i += 1) {
    const local = localParts(cursor, timezone);
    if (
      minute.matches(local.minute) &&
      hour.matches(local.hour) &&
      day.matches(local.day) &&
      month.matches(local.month) &&
      weekday.matches(local.weekday)
    ) return cursor;
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  }
  throw new Error('Could not resolve the next cron occurrence within one year.');
}

export function nextAutonomousRun(args: {
  triggerType: string;
  scheduleCron?: string | null;
  timezone?: string | null;
  after?: Date;
}): Date | null {
  const after = args.after ?? new Date();
  if (args.triggerType === 'continuous') return new Date(after.getTime() + 5 * 60 * 1000);
  if (args.triggerType !== 'schedule') return null;
  const cron = String(args.scheduleCron ?? '').trim();
  if (!cron) throw new Error('Scheduled goals require a cron expression.');
  return nextCronRun(cron, args.timezone || 'UTC', after);
}
