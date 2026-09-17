import type { MobileExecutionEnvelope } from './contracts';

export interface MobileTelemetryEvent {
  capability: string;
  target: string;
  risk: string;
  approvalRequired: boolean;
  timestamp: string;
}

export function toMobileTelemetry(envelope: MobileExecutionEnvelope): MobileTelemetryEvent {
  return {
    capability: envelope.request.capability,
    target: envelope.decision.target,
    risk: envelope.request.risk,
    approvalRequired: envelope.decision.requiresApproval,
    timestamp: envelope.createdAt,
  };
}
