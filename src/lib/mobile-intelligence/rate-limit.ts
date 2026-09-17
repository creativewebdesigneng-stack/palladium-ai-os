export interface MobileRateWindow {
  count: number;
  windowStartedAt: string;
}

export function withinMobileRateLimit(window: MobileRateWindow, now = new Date(), limit = 60, windowMs = 60_000): boolean {
  const started = Date.parse(window.windowStartedAt);
  if (!Number.isFinite(started) || now.getTime() - started >= windowMs) return true;
  return window.count < limit;
}
