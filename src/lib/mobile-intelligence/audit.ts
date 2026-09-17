import type { MobileExecutionEnvelope } from './contracts';

export interface MobileAuditRecord {
  requestId: string;
  deviceId: string;
  capability: string;
  risk: string;
  target: string;
  requiresApproval: boolean;
  createdAt: string;
  auditVersion: 1;
}

export function toMobileAuditRecord(envelope: MobileExecutionEnvelope): MobileAuditRecord {
  return {
    requestId: envelope.request.requestId,
    deviceId: envelope.request.deviceId,
    capability: envelope.request.capability,
    risk: envelope.request.risk,
    target: envelope.decision.target,
    requiresApproval: envelope.decision.requiresApproval,
    createdAt: envelope.createdAt,
    auditVersion: 1,
  };
}
