/**
 * Resource admission and per-session action exclusivity for Blackstar's
 * already deployed Playwright worker. No second session manager or database.
 *
 * All checks and reservations happen synchronously before asynchronous browser
 * creation/action execution. This is a single-process worker contract; a
 * multi-replica deployment needs sticky sessions or an external coordinator.
 */
export class BrowserSessionCapacityError extends Error {
  constructor() { super("Browser worker is at session capacity"); this.name = "BrowserSessionCapacityError"; }
}
export class BrowserSessionBusyError extends Error {
  constructor() { super("Browser session already has an action in progress"); this.name = "BrowserSessionBusyError"; }
}

export function createBrowserSessionGate(maxSessions) {
  if (!Number.isSafeInteger(maxSessions) || maxSessions < 1) {
    throw new Error("A positive browser session limit is required.");
  }
  let creating = 0;
  const active = new Set();
  function lease(onRelease) {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      onRelease();
    };
  }
  return {
    reserveCreate(existingSessions) {
      if (!Number.isSafeInteger(existingSessions) || existingSessions < 0) {
        throw new Error("Invalid browser session count");
      }
      if (existingSessions + creating >= maxSessions) throw new BrowserSessionCapacityError();
      creating += 1;
      return lease(() => { creating -= 1; });
    },
    acquire(sessionId) {
      if (typeof sessionId !== "string" || !sessionId) throw new Error("Browser session ID is required");
      if (active.has(sessionId)) throw new BrowserSessionBusyError();
      active.add(sessionId);
      return lease(() => { active.delete(sessionId); });
    },
    isActive(sessionId) { return active.has(sessionId); },
    status(existingSessions) {
      return {
        activeSessions: existingSessions,
        creatingSessions: creating,
        busySessions: active.size,
        availableSlots: Math.max(0, maxSessions - existingSessions - creating),
      };
    },
  };
}
