import type {
  MobileDeviceCapabilities,
  MobileIntelligenceRequest,
  MobileRoutingDecision,
} from './contracts';

const LOCAL_SAFE = new Set([
  'generate_text',
  'summarize',
  'rewrite',
  'classify',
  'extract',
  'image_understanding',
]);

export function routeMobileIntelligence(
  request: MobileIntelligenceRequest,
  device: MobileDeviceCapabilities,
): MobileRoutingDecision {
  const supported = device.capabilities.includes(request.capability);
  const consequential = request.capability === 'app_action' || request.risk === 'high';

  if (consequential) {
    return {
      target: supported ? 'hybrid' : 'astra',
      requiresApproval: true,
      reason: 'Consequential mobile actions require explicit Blackstar approval before execution.',
      capability: request.capability,
    };
  }

  if (
    request.preferOnDevice &&
    device.nativeIntelligenceAvailable &&
    supported &&
    LOCAL_SAFE.has(request.capability)
  ) {
    return {
      target: 'device',
      requiresApproval: false,
      reason: 'Requested capability is available and safe to execute on-device.',
      capability: request.capability,
    };
  }

  if (device.nativeIntelligenceAvailable && supported && !request.requiresNetwork) {
    return {
      target: 'hybrid',
      requiresApproval: request.risk === 'medium',
      reason: 'Device capability is available; Blackstar may coordinate or verify the result.',
      capability: request.capability,
    };
  }

  return {
    target: 'astra',
    requiresApproval: request.risk !== 'low',
    reason: 'The device cannot safely satisfy this request locally; route through Blackstar Astra.',
    capability: request.capability,
  };
}
