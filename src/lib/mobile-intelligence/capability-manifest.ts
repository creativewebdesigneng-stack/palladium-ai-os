import type { MobileDeviceCapabilities } from './contracts';

export interface MobileCapabilityManifest {
  schemaVersion: 1;
  platform: MobileDeviceCapabilities['platform'];
  provider?: MobileDeviceCapabilities['nativeProvider'];
  capabilities: MobileDeviceCapabilities['capabilities'];
  appActionsAvailable: boolean;
}

export function createCapabilityManifest(device: MobileDeviceCapabilities): MobileCapabilityManifest {
  return {
    schemaVersion: 1,
    platform: device.platform,
    provider: device.nativeIntelligenceAvailable ? device.nativeProvider : undefined,
    capabilities: [...new Set(device.capabilities)].sort(),
    appActionsAvailable: device.appActionsAvailable,
  };
}
