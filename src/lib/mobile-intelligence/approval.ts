import type { MobileExecutionEnvelope } from './contracts';

export interface MobileApprovalGate {
  allowedToExecute: boolean;
  needsApprovalRequest: boolean;
  reason: string;
}

export function assessMobileApproval(envelope: MobileExecutionEnvelope, approvalGranted = false): MobileApprovalGate {
  if (!envelope.decision.requiresApproval) {
    return { allowedToExecute: true, needsApprovalRequest: false, reason: 'Routing decision does not require approval.' };
  }
  if (!approvalGranted) {
    return { allowedToExecute: false, needsApprovalRequest: true, reason: 'Execution is paused until Blackstar approval is granted.' };
  }
  return { allowedToExecute: true, needsApprovalRequest: false, reason: 'Required Blackstar approval was granted.' };
}
