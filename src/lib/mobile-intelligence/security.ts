import type { MobileIntelligenceRequest } from './contracts';

const SENSITIVE_CONTEXT = new Set(['camera_context', 'voice_input']);

export interface MobileTransferDecision {
  allowed: boolean;
  reason: string;
}

export function mayTransferDeviceContext(
  request: MobileIntelligenceRequest,
  userAuthorizedTransfer: boolean,
): MobileTransferDecision {
  if (!SENSITIVE_CONTEXT.has(request.capability)) {
    return { allowed: true, reason: 'Capability does not inherently require sensitive device context.' };
  }
  if (!userAuthorizedTransfer) {
    return { allowed: false, reason: 'Sensitive device context must remain local until the user explicitly authorizes transfer.' };
  }
  return { allowed: true, reason: 'User explicitly authorized transfer of this device context.' };
}
