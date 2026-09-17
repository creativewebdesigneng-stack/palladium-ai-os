import { assessMobileApproval } from './approval';
import type { MobileDeviceCapabilities, MobileIntelligenceRequest } from './contracts';
import { createMobileExecutionEnvelope } from './envelope';
import { mayTransferDeviceContext } from './security';

export function prepareMobileExecution(
  request: MobileIntelligenceRequest,
  device: MobileDeviceCapabilities,
  options: { approvalGranted?: boolean; deviceContextTransferAuthorized?: boolean } = {},
) {
  const envelope = createMobileExecutionEnvelope(request, device);
  const transfer = mayTransferDeviceContext(request, options.deviceContextTransferAuthorized === true);
  const approval = assessMobileApproval(envelope, options.approvalGranted === true);
  return {
    envelope,
    transfer,
    approval,
    executable: transfer.allowed && approval.allowedToExecute,
  } as const;
}
