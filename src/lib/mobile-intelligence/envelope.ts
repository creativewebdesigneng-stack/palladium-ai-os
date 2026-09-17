import type { MobileDeviceCapabilities, MobileExecutionEnvelope, MobileIntelligenceRequest } from './contracts';
import { routeMobileIntelligence } from './router';

export function createMobileExecutionEnvelope(
  request: MobileIntelligenceRequest,
  device: MobileDeviceCapabilities,
  now = new Date(),
): MobileExecutionEnvelope {
  return {
    request,
    decision: routeMobileIntelligence(request, device),
    createdAt: now.toISOString(),
    auditVersion: 1,
  };
}
