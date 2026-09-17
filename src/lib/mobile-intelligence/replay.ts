export interface MobileReplayState {
  requestId: string;
  seenAt: string;
}

export function isReplayRequest(requestId: string, recent: readonly MobileReplayState[]): boolean {
  return recent.some((entry) => entry.requestId === requestId);
}
