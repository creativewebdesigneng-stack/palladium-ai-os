import type { MobileIntelligenceRequest } from './contracts';
import { isCompatibleMobileBridgeVersion } from './compatibility';
import { assertDeviceMatchesRequest } from './device-auth';
import { withinMobileRateLimit, type MobileRateWindow } from './rate-limit';
import { isReplayRequest, type MobileReplayState } from './replay';

export function assertMobileRequestAllowed(input: {
  protocolVersion: number;
  authenticatedDeviceId: string;
  request: MobileIntelligenceRequest;
  rateWindow: MobileRateWindow;
  recentRequests: readonly MobileReplayState[];
  now?: Date;
}): void {
  if (!isCompatibleMobileBridgeVersion(input.protocolVersion)) throw new Error('Unsupported mobile bridge protocol');
  assertDeviceMatchesRequest(input.authenticatedDeviceId, input.request.deviceId);
  if (!withinMobileRateLimit(input.rateWindow, input.now)) throw new Error('Mobile request rate limit exceeded');
  if (isReplayRequest(input.request.requestId, input.recentRequests)) throw new Error('Mobile request replay detected');
}
